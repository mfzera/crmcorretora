import { createFileRoute, notFound } from '@tanstack/react-router';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface BlogPostFull {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchPost(slug: string): Promise<BlogPostFull> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const response = await fetch(`${apiUrl}/public/blog/posts/${slug}`);
  if (response.status === 404) throw notFound();
  if (!response.ok) throw new Error('Falha ao carregar post');
  const data = await response.json();
  return data.post;
}

export const Route = createFileRoute('/_static/blog/$slug')({
  loader: async ({ params }) => {
    const post = await fetchPost(params.slug);
    return { post };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.post.title ?? 'Post'} - Blog Ecotech CRM` },
      { name: 'description', content: loaderData?.post.excerpt ?? '' },
      {
        property: 'og:title',
        content: `${loaderData?.post.title ?? 'Post'} - Blog Ecotech CRM`,
      },
      { property: 'og:description', content: loaderData?.post.excerpt ?? '' },
      { property: 'og:type', content: 'article' },
      {
        property: 'og:url',
        content: `https://ecotechts.com.br/blog/${loaderData?.post.slug ?? ''}`,
      },
      ...(loaderData?.post.coverImageUrl
        ? [{ property: 'og:image', content: loaderData.post.coverImageUrl }]
        : []),
    ],
    links: [
      {
        rel: 'canonical',
        href: `https://ecotechts.com.br/blog/${loaderData?.post.slug ?? ''}`,
      },
    ],
  }),
  component: BlogPostPage,
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  const html = DOMPurify.sanitize(marked.parse(post.content) as string);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao blog
        </Link>

        <p className="text-xs text-muted-foreground mb-4">
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })
            : new Date(post.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
        </p>

        <h1 className="text-4xl font-bold text-foreground mb-4">{post.title}</h1>
        <p className="text-muted-foreground text-lg mb-8">{post.excerpt}</p>

        {post.coverImageUrl && (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="w-full rounded-2xl mb-10 object-cover max-h-[480px]"
          />
        )}

        <div
          className="prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
