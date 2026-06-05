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
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Store Catalog</h1>
          <p className="mt-0.5 text-[13px] text-foreground/40">
            {loading ? "Loading..." : `${products.length} of ${total} products`}
          </p>
        </div>
        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-foreground text-background hover:opacity-90 transition-all active:scale-[0.98]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Open Shopping Agent
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="flex-1 px-3 py-2 rounded-md bg-background border border-border placeholder:text-foreground/25 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/[0.08] text-[13px] outline-none transition-all"
        />
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-[12px] rounded-md transition-colors cursor-pointer capitalize ${
                category === cat
                  ? "bg-foreground text-background font-medium"
                  : "border border-border text-foreground/50 hover:text-foreground hover:bg-foreground/[0.03]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="h-4 w-3/4 bg-foreground/[0.06] rounded animate-pulse" />
              <div className="h-3 w-full bg-foreground/[0.04] rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-foreground/[0.04] rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-border rounded-lg border-dashed">
          <h3 className="text-[13px] font-medium text-foreground/60">No products found</h3>
          <p className="mt-1 text-[12px] text-foreground/35">
            Run <code className="font-mono text-[11px]">npm run db:seed</code> to populate the
            catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
    <div className="rounded-lg border border-border p-4 hover:border-foreground/20 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-[14px] font-medium leading-snug">{product.name}</h3>
        <span className="text-[14px] font-semibold tabular-nums shrink-0">
          ${product.priceDollars.toFixed(2)}
        </span>
      </div>
      <p className="text-[12px] text-foreground/40 leading-relaxed line-clamp-2 mb-3">
        {product.description}
      </p>
      <div className="flex items-center gap-2 text-[11px] text-foreground/30 font-mono">
        <span className="px-1.5 py-0.5 rounded bg-foreground/[0.04] border border-border capitalize">
          {product.category}
        </span>
        <span className="truncate">{product.id}</span>
      </div>
    </div>
  );
}
