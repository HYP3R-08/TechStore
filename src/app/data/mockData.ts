import { Product, CartItem } from '../../lib/supabase';

export type { Product, CartItem };

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'MacBook Pro 14" M3',
    price: 2499,
    category: 'Laptop',
    image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
    description: 'Apple MacBook Pro with M3 chip. 16GB unified memory, 512GB SSD. Up to 22 hours battery life. Ideal for creative professionals and developers.',
    featured: true,
    stock: 15,
    brand: 'Apple',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Dell XPS 15',
    price: 1799,
    category: 'Laptop',
    image_url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800&q=80',
    description: 'Intel Core i7-13700H, 16GB DDR5 RAM, 512GB NVMe SSD, NVIDIA RTX 4060. 15.6" OLED display. Premium build quality for power users.',
    featured: true,
    stock: 8,
    brand: 'Dell',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'AMD Ryzen 9 7950X',
    price: 699,
    category: 'Components',
    image_url: 'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/graphic-cards/50-series/geforce-rtx-50series-og-1200x630.jpg',
    description: '16-core, 32-thread desktop processor. Max boost clock up to 5.7GHz. 80MB total cache. AM5 socket. Perfect for workstations and content creation.',
    featured: true,
    stock: 25,
    brand: 'AMD',
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'NVIDIA GeForce RTX 4080 Super',
    price: 1099,
    category: 'Components',
    image_url: 'https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/graphic-cards/50-series/geforce-rtx-50series-og-1200x630.jpg',
    description: '16GB GDDR6X memory. DLSS 3.5 and Ray Tracing. 4nm Ada Lovelace architecture. Exceptional performance for 4K gaming and AI workloads.',
    featured: false,
    stock: 12,
    brand: 'NVIDIA',
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Samsung 990 Pro 2TB SSD',
    price: 179,
    category: 'Components',
    image_url: 'https://images.unsplash.com/photo-1601524909162-ae8725290836?w=800&q=80',
    description: 'PCIe 4.0 NVMe SSD. Sequential read up to 7,450 MB/s. Enhanced thermal control for sustained performance. 5-year warranty.',
    featured: false,
    stock: 40,
    brand: 'Samsung',
    created_at: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Corsair 32GB DDR5 6000MHz',
    price: 129,
    category: 'Components',
    image_url: 'https://images.unsplash.com/photo-1591338800700-86d3a54f9c51?w=800&q=80',
    description: 'Vengeance DDR5 RAM kit (2×16GB). XMP 3.0 support. 6000MHz speed. Low-profile design with dynamic RGB lighting.',
    featured: false,
    stock: 45,
    brand: 'Corsair',
    created_at: new Date().toISOString()
  },
  {
    id: '7',
    name: 'LG UltraGear 27" 4K 144Hz',
    price: 699,
    category: 'Monitor',
    image_url: 'https://images.unsplash.com/photo-1527443224154-c4a573d5c0f0?w=800&q=80',
    description: '27" Nano IPS, 4K UHD, 144Hz, 1ms GTG. G-Sync Compatible and FreeSync Premium Pro. USB-C 90W power delivery. Perfect for gaming and professional work.',
    featured: false,
    stock: 20,
    brand: 'LG',
    created_at: new Date().toISOString()
  },
  {
    id: '8',
    name: 'Logitech MX Master 3S',
    price: 99,
    category: 'Others',
    image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80',
    description: 'Advanced wireless mouse. 8000 DPI sensor. Ultrafast MagSpeed scroll wheel. Connect to 3 devices. 70-day battery life. Ergonomic design.',
    featured: false,
    stock: 50,
    brand: 'Logitech',
    created_at: new Date().toISOString()
  },
  {
    id: '9',
    name: 'Corsair K95 RGB Platinum',
    price: 199,
    category: 'Others',
    image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
    description: 'Mechanical gaming keyboard with Cherry MX Speed switches. Per-key RGB backlighting. 6 dedicated G-keys. Aircraft-grade aluminum frame. USB passthrough.',
    featured: false,
    stock: 30,
    brand: 'Corsair',
    created_at: new Date().toISOString()
  },
  {
    id: '10',
    name: 'Sony WH-1000XM5',
    price: 349,
    category: 'Others',
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    description: 'Industry-leading noise cancellation. 30-hour battery life. Crystal clear hands-free calling with 8 microphones. Multipoint connection for 2 devices simultaneously.',
    featured: false,
    stock: 35,
    brand: 'Sony',
    created_at: new Date().toISOString()
  },
  {
    id: '11',
    name: 'TP-Link Archer AX90',
    price: 249,
    category: 'Smartphone',
    image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80',
    description: 'AX6600 Tri-Band Wi-Fi 6 Router. 2.5G WAN port. OFDMA and MU-MIMO. Covers up to 2500 sq ft. Ideal for home offices and gaming.',
    featured: false,
    stock: 18,
    brand: 'TP-Link',
    created_at: new Date().toISOString()
  },
  {
    id: '12',
    name: 'ASUS ROG Strix G16',
    price: 1499,
    category: 'Gaming',
    image_url: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800&q=80',
    description: 'Gaming laptop with Intel Core i9-13980HX, NVIDIA RTX 4070, 16" 240Hz QHD display, 32GB DDR5, 1TB SSD. Dominate every game.',
    featured: false,
    stock: 10,
    brand: 'ASUS',
    created_at: new Date().toISOString()
  }
];

export const categories = ['All', 'Laptop', 'Components', 'Monitor', 'Smartphone', 'Gaming', 'Others'];
