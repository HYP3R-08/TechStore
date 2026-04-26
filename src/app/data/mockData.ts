export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  featured: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Minimalist Watch',
    price: 299,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    description: 'Elegant timepiece with Japanese movement and Italian leather strap. Precision crafted for the modern professional.',
    featured: true
  },
  {
    id: '2',
    name: 'Leather Portfolio',
    price: 189,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80',
    description: 'Premium full-grain leather portfolio. Handcrafted with attention to every detail.',
    featured: true
  },
  {
    id: '3',
    name: 'Wireless Headphones',
    price: 349,
    category: 'Audio',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    description: 'Studio-quality sound with active noise cancellation. 30-hour battery life.',
    featured: true
  },
  {
    id: '4',
    name: 'Designer Sunglasses',
    price: 229,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80',
    description: 'Polarized lenses with UV400 protection. Titanium frame for durability.',
    featured: false
  },
  {
    id: '5',
    name: 'Ceramic Vase',
    price: 149,
    category: 'Home',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80',
    description: 'Handcrafted ceramic vase. Modern minimalist design for contemporary spaces.',
    featured: false
  },
  {
    id: '6',
    name: 'Premium Notebook',
    price: 45,
    category: 'Stationery',
    image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&q=80',
    description: 'Luxury paper notebook with elastic closure. 192 pages of premium paper.',
    featured: false
  },
  {
    id: '7',
    name: 'Desk Organizer',
    price: 89,
    category: 'Home',
    image: 'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=800&q=80',
    description: 'Minimalist desk organizer in brushed aluminum. Keep your workspace pristine.',
    featured: false
  },
  {
    id: '8',
    name: 'Leather Wallet',
    price: 129,
    category: 'Accessories',
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',
    description: 'Slim bifold wallet in premium leather. RFID blocking for security.',
    featured: false
  }
];

export const categories = ['All', 'Accessories', 'Audio', 'Home', 'Stationery'];
