import { useLocation } from 'react-router';
import { useEffect } from 'react';
import { Building2, ShieldCheck, FileText } from 'lucide-react';

const sections = [
  {
    id: 'about',
    icon: Building2,
    title: 'About',
    content: `TechStore is a fictional e-commerce project created for demonstration and portfolio purposes only.
This website, its brand, and all content on it are entirely made up and do not represent any real company or organization.
No real transactions take place. Any orders placed are simulated and no actual goods will be shipped.
All product names, descriptions, prices, and images are used purely for illustrative purposes and may belong to their respective owners.
This project was built by Pennino Cristian Francesco as a full-stack web development showcase.`,
  },
  {
    id: 'privacy',
    icon: ShieldCheck,
    title: 'Privacy Policy',
    content: `This is a fictional privacy policy for a fictional company.
Any personal data you enter on this site (such as your email address) may be stored solely for the purpose of demonstrating authentication features.
No data is sold, shared, or used for any commercial purpose.
This site uses Supabase for backend services. Please refer to Supabase's own privacy policy for information on how data is handled at the infrastructure level.
By using this site you acknowledge that it is a demo project and that no real privacy guarantees are made beyond those provided by the underlying infrastructure.`,
  },
  {
    id: 'terms',
    icon: FileText,
    title: 'Terms of Service',
    content: `These are fictional terms of service for a fictional company. Nothing here is legally binding.
This website exists solely as a portfolio and demonstration project. It is not a real store and does not sell real products.
All checkout flows are connected to Stripe's test environment. No real money is charged.
You may browse, register, and interact with the site freely. Please do not attempt to abuse or exploit the platform.
The creator reserves the right to take the site offline or modify it at any time without notice.`,
  },
];

export function Company() {
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
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-full">
          <span className="text-xs font-normal text-yellow-700 dark:text-yellow-400 tracking-wide">
            This is a fictional company — all products and content are fake
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-black dark:text-white mt-6 mb-4">
          Company
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-16 tracking-wide">
          Legal and company information for this demo project.
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
