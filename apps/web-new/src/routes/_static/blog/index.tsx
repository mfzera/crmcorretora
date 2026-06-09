import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/core/ui/skeleton';
import { ArrowRight, BookOpen } from 'lucide-react';

export const Route = createFileRoute('/_static/blog/')({
  head: () => ({
    meta: [
      { title: 'Blog - Ecotech CRM' },
      {
        name: 'description',
        content:
          'Artigos, dicas e novidades sobre CRM para corretoras de seguros. Aprenda a otimizar seu processo de vendas e gestão de clientes.',
      },
      { property: 'og:title', content: 'Blog - Ecotech CRM' },
      {
        property: 'og:description',
        content:
          'Artigos, dicas e novidades sobre CRM para corretoras de seguros.',
      },
      { property: 'og:url', content: 'https://ecotechts.com.br/blog' },
    ],
    links: [{ rel: 'canonical', href: 'https://ecotechts.com.br/blog' }],
  }),
  component: BlogIndexPage,
});

interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
}

function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/public/blog/posts`);
        if (!response.ok) throw new Error('Falha ao carregar posts');
        const data = await response.json();
        setPosts(data.posts);
      } catch {
        setError('Não foi possível carregar os posts.');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Blog</h1>
          <p className="text-muted-foreground text-lg">
            Artigos, dicas e novidades para corretoras de seguros.
          </p>
        </div>

        {loading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-2xl border border-border">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum post publicado ainda.</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="block p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors group"
              >
                {post.coverImageUrl && (
                  <img
                    src={post.coverImageUrl}
                    alt={post.title}
                    className="w-full h-48 object-cover rounded-xl mb-4"
                    loading="lazy"
                  />
                )}
                <p className="text-xs text-muted-foreground mb-2">
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
                <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {post.excerpt}
                </p>
                <span className="inline-flex items-center gap-1 text-primary text-sm font-medium">
                  Ler mais <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
