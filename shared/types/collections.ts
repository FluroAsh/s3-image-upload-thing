export type CollectionPhoto = {
  /** CDN path of the set, `{prefix}{folder}/{name}`. */
  set: string;
  alt: string | null;
  caption: string | null;
  tags: string[];
};

export type Collection = {
  /** `^[a-z0-9]+(-[a-z0-9]+)*$`, fixed after creation: site URLs use it. */
  slug: string;
  name: string;
  /** Related collections share a series; absent until phase 2. */
  series?: string;
  /** A post slug in the portfolio, checked at its build; absent until phase 2. */
  post?: string;
  /** A set in this collection; the first photo when absent. */
  cover?: string;
  /** Display order. */
  photos: CollectionPhoto[];
};

export type CollectionsFile = {
  schema: 1;
  /** ISO 8601 time of the last write. */
  updatedAt: string;
  /** Display order of the collections. */
  collections: Collection[];
};
