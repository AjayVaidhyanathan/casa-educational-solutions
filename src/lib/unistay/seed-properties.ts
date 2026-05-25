import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/unistay/firebase';
import { casaProperties } from '@/lib/unistay/properties';

// Seeds all static Casa properties into Firestore `listings` collection.
// Uses each property's existing ID so detail page URLs stay compatible.
// Safe to run multiple times — treats permission-denied on update as "already exists".
export async function seedCasaProperties(): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;

  for (const prop of casaProperties) {
    try {
      await setDoc(doc(db, 'listings', prop.id), {
        source: 'casa',
        status: 'approved',
        title: prop.title,
        type: prop.type,
        city: prop.city,
        address: prop.address,
        price: prop.price,
        bedrooms: prop.bedrooms,
        size: prop.size,
        availableFrom: prop.availableFrom,
        description: prop.description,
        features: prop.features,
        images: prop.images,
        featured: prop.featured ?? false,
        seededAt: new Date().toISOString(),
      });
      seeded++;
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'permission-denied') {
        skipped++;
      } else {
        throw err;
      }
    }
  }

  return { seeded, skipped };
}
