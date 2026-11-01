// Modified by Purpgo LLC.
import { getPageImage, source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { generate as DefaultImage } from 'fumadocs-ui/og';

export const revalidate = false;

// The Purpgo mark, same single path as site/src/components/Logo.astro.
function Mark() {
  return (
    <img src="/brand/purpgo-logo.svg" alt="Purpgo" width={208} height={52} style={{ height: 52, width: "auto" }} />
  );
}

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    <DefaultImage
      title={page.data.title}
      description={page.data.description}
      site="Purpgo Docs"
      icon={<Mark />}
      primaryColor="rgba(2, 132, 199, 0.45)"
      primaryTextColor="rgb(125, 211, 252)"
    />,
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
