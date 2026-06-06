"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  priceDollars: number;
  category: string;
  merchant: string;
  sku: string;
}

const CATEGORIES = ["all", "hubs", "monitors", "cables", "accessories"] as const;

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchProducts, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts, query]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
            Store Catalog
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            {loading ? "Loading..." : `${products.length} of ${total} products available`}
          </p>
        </div>
        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 transition-all active:scale-[0.98] shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Shop with Agent
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-7">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="flex-1 px-4 py-3 rounded-xl bg-background border-2 border-border placeholder:text-foreground/35 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none transition-all shadow-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer capitalize ${
                category === cat
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-xl shadow-blue-500/30"
                  : "border-2 border-border text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03] hover:border-blue-200 dark:hover:border-blue-800/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border-2 border-border p-6 space-y-4 bg-white dark:bg-gray-900/50 shadow-lg">
              <div className="h-5 w-3/4 bg-gradient-to-r from-foreground/[0.08] to-foreground/[0.04] rounded-lg animate-pulse" />
              <div className="h-4 w-full bg-gradient-to-r from-foreground/[0.06] to-foreground/[0.03] rounded-lg animate-pulse" />
              <div className="h-4 w-1/3 bg-gradient-to-r from-foreground/[0.06] to-foreground/[0.03] rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-background">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mb-4">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground/30"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-foreground/70 mb-2">No products found</h3>
          <p className="text-sm text-foreground/50 text-center max-w-sm">
            Run <code className="px-2 py-1 rounded-md bg-foreground/5 font-mono text-xs border border-border">npm run db:seed</code> to populate the catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group rounded-2xl border-2 border-border p-6 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900/50 dark:to-background hover:border-blue-200 dark:hover:border-blue-800/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-bold leading-snug text-foreground/90 group-hover:text-foreground transition-colors">
          {product.name}
        </h3>
        <span className="text-lg font-bold tabular-nums shrink-0 text-blue-600 dark:text-blue-400">
          ${product.priceDollars.toFixed(2)}
        </span>
      </div>
      <p className="text-sm text-foreground/60 leading-relaxed line-clamp-2 mb-4">
        {product.description}
      </p>
      <div className="flex items-center gap-2 text-xs text-foreground/50 font-mono pt-3 border-t border-border/50">
        <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 border border-blue-200/50 dark:border-blue-800/50 capitalize font-semibold text-blue-700 dark:text-blue-400">
          {product.category}
        </span>
        <span className="truncate text-foreground/40">{product.id}</span>
      </div>
    </div>
  );
}
