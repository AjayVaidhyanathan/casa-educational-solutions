'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import type { CasaProperty } from '@/lib/unistay/types';

function docToCasaProperty(id: string, data: Record<string, unknown>): CasaProperty {
  return {
    source: 'casa',
    id,
    title: (data.title as string) ?? '',
    type: (data.type as CasaProperty['type']) ?? 'studio',
    city: (data.city as string) ?? '',
    address: (data.address as string) ?? '',
    price: (data.price as number) ?? 0,
    bedrooms: (data.bedrooms as number) ?? 1,
    size: (data.size as number) ?? 0,
    availableFrom: (data.availableFrom as string) ?? '',
    description: (data.description as string) ?? '',
    features: (data.features as string[]) ?? [],
    images: (data.images as string[])?.length
      ? (data.images as string[])
      : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    featured: (data.featured as boolean) ?? false,
  };
}

// Fetches all approved listings from Firestore for the search/browse page.
export function useFirestoreListings() {
  const [listings, setListings] = useState<CasaProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'listings'),
      where('status', '==', 'approved')
    );
    getDocs(q)
      .then((snap) => {
        const props = snap.docs.map((d) =>
          docToCasaProperty(d.id, d.data() as Record<string, unknown>)
        );
        setListings(props);
      })
      .finally(() => setLoading(false));
  }, []);

  return { listings, loading };
}

// Fetches a single property by ID from Firestore.
export function useFirestoreProperty(id: string) {
  const [property, setProperty] = useState<CasaProperty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; } // eslint-disable-line react-hooks/set-state-in-effect
    getDoc(doc(db, 'listings', id))
      .then((snap) => {
        if (snap.exists()) {
          setProperty(docToCasaProperty(snap.id, snap.data() as Record<string, unknown>));
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { property, loading };
}
