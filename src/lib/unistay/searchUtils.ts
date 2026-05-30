import type { FilterValues, Property } from './types';

export function fuzzyIncludes(query: string, target: string): boolean {
  const words = query.toLowerCase().trim().split(/\s+/);
  const t = target.toLowerCase();
  return words.every((word) => {
    if (!word) return true;
    if (t.includes(word)) return true;
    let qi = 0;
    for (const ch of t) {
      if (ch === word[qi]) qi++;
      if (qi === word.length) return true;
    }
    return false;
  });
}

export function applyFilters(properties: Property[], filters: FilterValues): Property[] {
  return properties.filter((p) => {
    if (filters.search) {
      if (!fuzzyIncludes(filters.search, `${p.title} ${p.city} ${p.address ?? ''}`)) return false;
    }
    if (filters.type && p.type !== filters.type) return false;
    if (filters.city) {
      const fc = filters.city.toLowerCase();
      const pc = p.city.toLowerCase();
      if (!pc.includes(fc) && !fc.includes(pc)) return false;
    }
    if (p.price < filters.minPrice || p.price > filters.maxPrice) return false;
    if (filters.bedrooms && filters.bedrooms !== 'all') {
      const n = parseInt(filters.bedrooms);
      if (n === 3 ? p.bedrooms < 3 : p.bedrooms !== n) return false;
    }
    if (filters.features.length > 0) {
      if (!filters.features.every((f) => p.features.includes(f))) return false;
    }
    if (filters.source === 'casa'     && p.source !== 'casa') return false;
    if (filters.source === 'external' && p.source === 'casa') return false;
    return true;
  });
}

export function sortProperties(properties: Property[], sortBy: string): Property[] {
  return [...properties].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':  return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'newest':     return new Date(a.availableFrom).getTime() - new Date(b.availableFrom).getTime();
      default: {
        const af = a.source === 'casa' && (a as { featured?: boolean }).featured ? 1 : 0;
        const bf = b.source === 'casa' && (b as { featured?: boolean }).featured ? 1 : 0;
        return bf - af;
      }
    }
  });
}
