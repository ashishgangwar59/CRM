'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic<{ url: string }>(
  () => import('swagger-ui-react'),
  { ssr: false }
);

export default function ApiDocPage() {
  return (
    <section className="container mx-auto mt-12 p-4">
      <SwaggerUI url="/api/swagger" />
    </section>
  );
}
