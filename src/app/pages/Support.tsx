import { useLocation } from 'react-router';
import { useEffect } from 'react';
import { Mail, Truck, RotateCcw, Wrench } from 'lucide-react';

const sections = [
  {
    id: 'contact',
    icon: Mail,
    title: 'Contact Us',
    content: `Our customer support team is available Monday through Friday, 9:00 AM – 6:00 PM (CET).
You can reach us at support@techstore.com.
We aim to respond to all inquiries within 24 hours on business days.
For urgent technical issues, please include your order number and a brief description of the problem so we can assist you as quickly as possible.`,
  },
  {
    id: 'shipping',
    icon: Truck,
    title: 'Shipping Info',
    content: `We ship to most countries worldwide. All orders are processed within 1–2 business days.
Standard shipping typically takes 3–7 business days depending on your location.
Orders over €100 qualify for free standard shipping automatically.
Once your order has shipped, you will receive a tracking number via email so you can monitor your delivery in real time.`,
  },
  {
    id: 'returns',
    icon: RotateCcw,
    title: 'Returns',
    content: `We offer a 30-day return policy on all products. Items must be returned in their original packaging and in unused condition.
To initiate a return, contact our support team with your order number and reason for the return.
Once we receive and inspect the item, a full refund will be issued to your original payment method within 5–10 business days.
Please note that shipping costs for returns are the responsibility of the customer unless the item was defective or sent in error.`,
  },
  {
    id: 'technical-support',
    icon: Wrench,
    title: 'Technical Support',
    content: `Our certified technicians are here to help you get the most out of your TechStore products.
Whether you need help with setup, compatibility questions, driver installation, or troubleshooting, we have you covered.
You can reach technical support via email at tech@techstore.com or by phone at +1 (800) 123-4567 during business hours.`,
  },
];

export function Support() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-black dark:text-white mb-4">
          Support
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-16 tracking-wide">
          Everything you need to know about orders, shipping, and getting help.
        </p>

        <div className="space-y-16">
          {sections.map(({ id, icon: Icon, title, content }) => (
            <section key={id} id={id} className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-black dark:text-white" />
                </div>
                <h2 className="text-2xl font-light tracking-tight text-black dark:text-white">
                  {title}
                </h2>
              </div>
              <div className="pl-12">
                {content.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-3 last:mb-0 tracking-wide">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>


      </div>
    </div>
  );
}
