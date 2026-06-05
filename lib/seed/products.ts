export interface SeedProduct {
  name: string;
  description: string;
  priceCents: number;
  category: string;
  sku: string;
  merchant?: string;
}

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: "USB-C Hub 7-in-1",
    description: "Compact aluminum hub with HDMI, SD card, and 3 USB-A ports.",
    priceCents: 3800,
    category: "hubs",
    sku: "HUB-USB7-001",
  },
  {
    name: '27" 4K Monitor',
    description: "IPS panel, 60Hz, USB-C power delivery — ideal for home office.",
    priceCents: 12000,
    category: "monitors",
    sku: "MON-27-4K-001",
  },
  {
    name: "USB-C to USB-C Cable 2m",
    description: "100W PD, braided nylon, data + charging.",
    priceCents: 1499,
    category: "cables",
    sku: "CBL-USBC-2M",
  },
  {
    name: "USB-C Hub 4-in-1 Mini",
    description: "Pocket-sized hub with HDMI and dual USB-A.",
    priceCents: 2499,
    category: "hubs",
    sku: "HUB-USB4-MINI",
  },
  {
    name: '24" FHD Monitor',
    description: "1080p IPS display with slim bezels.",
    priceCents: 15900,
    category: "monitors",
    sku: "MON-24-FHD",
  },
  {
    name: "Thunderbolt 4 Dock",
    description: "Dual 4K display support, 90W laptop charging.",
    priceCents: 18900,
    category: "hubs",
    sku: "HUB-TB4-DOCK",
  },
  {
    name: "HDMI 2.1 Cable 3m",
    description: "48Gbps, 8K ready, gold-plated connectors.",
    priceCents: 1999,
    category: "cables",
    sku: "CBL-HDMI-3M",
  },
  {
    name: "Laptop Stand Aluminum",
    description: "Ergonomic riser with cable management slot.",
    priceCents: 3499,
    category: "accessories",
    sku: "ACC-STAND-ALU",
  },
  {
    name: "Wireless Keyboard Compact",
    description: "Low-profile keys, multi-device Bluetooth.",
    priceCents: 4999,
    category: "accessories",
    sku: "ACC-KB-WIRELESS",
  },
  {
    name: "Ergonomic Mouse",
    description: "Vertical design, reduces wrist strain.",
    priceCents: 2999,
    category: "accessories",
    sku: "ACC-MOUSE-ERGO",
  },
  {
    name: "USB-C to HDMI Adapter",
    description: "4K@60Hz, plug-and-play, no drivers.",
    priceCents: 1299,
    category: "cables",
    sku: "CBL-USBC-HDMI",
  },
  {
    name: "Portable SSD 1TB",
    description: "USB-C 10Gbps, hardware encryption.",
    priceCents: 8900,
    category: "accessories",
    sku: "ACC-SSD-1TB",
  },
  {
    name: "Webcam 1080p",
    description: "Auto-focus, built-in mic, privacy shutter.",
    priceCents: 5999,
    category: "accessories",
    sku: "ACC-WEBCAM-1080",
  },
  {
    name: '34" Ultrawide Monitor',
    description: "WQHD curved panel for productivity.",
    priceCents: 34900,
    category: "monitors",
    sku: "MON-34-UW",
  },
  {
    name: "USB-C Power Adapter 65W",
    description: "GaN charger, foldable plug, 2 ports.",
    priceCents: 3999,
    category: "accessories",
    sku: "ACC-CHARGER-65W",
  },
  {
    name: "Desk Mat XL",
    description: "Water-resistant, anti-slip base.",
    priceCents: 2499,
    category: "accessories",
    sku: "ACC-DESKMAT-XL",
  },
  {
    name: "USB-A to USB-C Adapter 2-pack",
    description: "Compact dongles for legacy devices.",
    priceCents: 999,
    category: "cables",
    sku: "CBL-ADAPTER-2PK",
  },
  {
    name: "Monitor Arm Single",
    description: "VESA mount, gas spring, cable clip.",
    priceCents: 7999,
    category: "accessories",
    sku: "ACC-MON-ARM",
  },
  {
    name: "USB-C Hub with Ethernet",
    description: "Gigabit RJ45, 100W PD pass-through.",
    priceCents: 4499,
    category: "hubs",
    sku: "HUB-USB-ETH",
  },
  {
    name: "Noise-Cancelling Headphones",
    description: "Over-ear, 30h battery, USB-C charging.",
    priceCents: 14900,
    category: "accessories",
    sku: "ACC-HEADPHONE-NC",
  },
];
