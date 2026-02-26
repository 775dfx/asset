import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export const SectionCard = ({ title, subtitle, children }: SectionCardProps) => (
  <section className="glass-panel rounded-3xl p-6 md:p-8">
    <div className="mb-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle ? <p className="text-slate-300 mt-2">{subtitle}</p> : null}
    </div>
    {children}
  </section>
);
