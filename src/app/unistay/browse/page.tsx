"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  MapPin,
  Calendar,
  Video,
  Shield,
  Clock,
  Heart,
  Home as HomeIcon,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/unistay/ui/button";
import { Card } from "@/components/unistay/ui/card";
import { Badge } from "@/components/unistay/ui/badge";
import { SearchCard } from "@/components/unistay/SearchCard";
import { PropertyCard } from "@/components/unistay/PropertyCard";
import { casaProperties } from "@/lib/unistay/properties";
import { useFirestoreListings } from "@/lib/unistay/useFirestoreListings";
import type { Property } from "@/lib/unistay/types";

export default function Landing() {
  const { listings: firestoreListings, loading: firestoreLoading } = useFirestoreListings();
  const [haFeatured, setHaFeatured] = useState<Property[]>([]);

  // Fetch top 3 live HA listings to round out the featured section
  useEffect(() => {
    fetch("/api/unistay/listings?city=Berlin")
      .then((r) => r.json())
      .then((data: Property[]) => setHaFeatured(data.slice(0, 3)))
      .catch(() => {});
  }, []);

  // Prefer Firestore listings; fill gaps with HA live listings; fall back to static
  const featured: Property[] = (() => {
    const firestore = firestoreListings.slice(0, 3);
    if (firestore.length >= 3) return firestore;
    const combined = [...firestore, ...haFeatured].slice(0, 3);
    if (combined.length >= 3) return combined;
    return [...combined, ...casaProperties.filter((p) => p.featured)].slice(0, 3);
  })();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative">
        <div className="relative h-[600px] md:h-[700px]">
          <Image
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1600"
            alt="Students in kitchen"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          <div className="relative container mx-auto px-4 h-full">
            <div className="flex flex-col lg:flex-row items-center justify-between h-full py-16">
              {/* Left Content */}
              <div className="flex-1 text-white max-w-xl drop-shadow-lg">
                <p className="text-sm uppercase tracking-wider mb-4 font-medium text-white/90">
                  THE BEST WAY TO
                </p>
                <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight text-white">
                  Find your happy place
                </h1>
                <p className="text-lg md:text-xl text-white/90">
                  UniStay: Search student flats for rent in Germany
                </p>
              </div>

              {/* Search Card */}
              <SearchCard />
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="bg-black py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {/* Trustpilot */}
              <div className="bg-white rounded-xl px-8 py-4 flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-green-600 font-bold text-lg">✓</span>
                    <span className="font-semibold text-gray-900">
                      Trustpilot
                    </span>
                  </div>
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="text-green-600">
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">
                    TrustScore: 4.8 | 147 reviews
                  </p>
                </div>
              </div>

              {/* Students Trust */}
              <div className="bg-white rounded-xl px-8 py-4 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-pink-400 border-2 border-white"
                    />
                  ))}
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">1200+</p>
                  <p className="text-sm text-gray-700">
                    Trusted by students all around the world
                  </p>
                </div>
              </div>

              {/* Google Reviews */}
              <div className="flex items-center gap-3">
                <span className="text-4xl md:text-5xl font-bold text-white">
                  Google
                </span>
                <div className="flex text-yellow-400 text-2xl">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Flats Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Featured Flats</h2>
            <p className="text-gray-600 text-lg">
              Hand-picked student properties across Germany
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {firestoreLoading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 h-72 animate-pulse" />
                ))
              : featured.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))
            }
          </div>

          <div className="text-center mt-10">
            <Link href="/unistay/search">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base">
                View All Properties →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How it Works</h2>
            <p className="text-gray-600 text-lg">
              Find your perfect student home in just 4 simple steps
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  icon: Search,
                  title: "Search & Browse",
                  desc: "Browse through verified student flats in your preferred city and filter by budget, size, and amenities.",
                },
                {
                  icon: Video,
                  title: "Virtual / In-Person Tour",
                  desc: "Take a 360° virtual tour or schedule an in-person visit to explore the flat from anywhere.",
                },
                {
                  icon: Calendar,
                  title: "Quick Booking",
                  desc: "Submit your documents online and our team will verify everything within 24 hours.",
                },
                {
                  icon: HomeIcon,
                  title: "Move In",
                  desc: "Sign the contract digitally and move into your new home — it's that simple!",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{title}</h3>
                  <p className="text-gray-600">{desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/unistay/search">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-12"
                >
                  Start your Search Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need for a Smooth Move
            </h2>
            <p className="text-gray-400 text-lg">
              We&apos;ve simplified student housing so you can focus on what
              matters — your studies and new adventures
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Video,
                title: "Virtual Tours",
                desc: "Explore every corner with 360° virtual tours. See your future home without leaving yours.",
              },
              {
                icon: Calendar,
                title: "Flexible Viewings",
                desc: "Book in-person tours at your convenience — evenings and weekends included.",
              },
              {
                icon: MapPin,
                title: "Prime Locations",
                desc: "All flats within walking distance of universities and public transport.",
              },
              {
                icon: Shield,
                title: "Verified & Safe",
                desc: "Every listing is personally inspected and verified by our team.",
              },
              {
                icon: Clock,
                title: "Move In Fast",
                desc: "From search to keys in hand — complete the process in as little as 3 days.",
              },
              {
                icon: Heart,
                title: "Dedicated Support",
                desc: "Your personal housing advisor is available 24/7 via chat, phone, or email.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-6 bg-gray-800 border-gray-700">
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">
                  {title}
                </h3>
                <p className="text-gray-400">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="text-blue-600">Do more</span> than just browse
              apartments online
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl mx-auto">
            {[
              { icon: HomeIcon, label: "StudyMatch AI" },
              { icon: HomeIcon, label: "UniStay" },
              { icon: Briefcase, label: "Ausbildung" },
              { icon: Briefcase, label: "Ausbildung B2B" },
            ].map(({ icon: Icon, label }) => (
              <Badge
                key={label}
                variant="outline"
                className="px-6 py-3 text-base"
              >
                <Icon className="h-5 w-5 mr-2 text-blue-600" />
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
