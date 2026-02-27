import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { resolveResource } from '@tauri-apps/api/path';
import { readTextFile } from '@tauri-apps/plugin-fs';

interface ManualModalProps {
  open: boolean;
  onClose: () => void;
}

const USER_MANUAL_RESOURCE_PATH_CANDIDATES = ['user-manual.md', 'resources/user-manual.md'] as const;

export function ManualModal({ open, onClose }: ManualModalProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || content) {
      return;
    }

    const loadManual = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        let loaded = false;
        let lastError: unknown;

        for (const resourcePath of USER_MANUAL_RESOURCE_PATH_CANDIDATES) {
          try {
            const manualPath = await resolveResource(resourcePath);
            const manualContent = await readTextFile(manualPath);
            setContent(manualContent);
            loaded = true;
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!loaded) {
          throw lastError;
        }
      } catch (error) {
        console.error('Failed to load user manual markdown file.', error);
        setLoadError('マニュアルの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    void loadManual();
  }, [open, content]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6" onClick={onClose}>
      <div
        className="flex h-[min(82vh,760px)] w-[min(980px,100%)] flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-100">{t('tabs.manual')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-700 bg-gray-900 p-1.5 text-gray-300 transition-colors hover:bg-gray-800"
            aria-label={t('tabs.manual')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loading && <p className="text-sm text-gray-400">Loading manual...</p>}
          {loadError && <p className="text-sm text-red-300">{loadError}</p>}
          {!loading && !loadError && (
            <article className="text-sm leading-7 text-gray-200">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ ...props }) => <h1 className="mb-4 text-2xl font-bold text-gray-100" {...props} />,
                  h2: ({ ...props }) => <h2 className="mb-3 mt-7 text-xl font-semibold text-gray-100" {...props} />,
                  h3: ({ ...props }) => <h3 className="mb-2 mt-5 text-lg font-semibold text-gray-100" {...props} />,
                  p: ({ ...props }) => <p className="mb-3 text-gray-200" {...props} />,
                  ul: ({ ...props }) => <ul className="mb-4 list-disc pl-6 text-gray-200" {...props} />,
                  ol: ({ ...props }) => <ol className="mb-4 list-decimal pl-6 text-gray-200" {...props} />,
                  li: ({ ...props }) => <li className="mb-1" {...props} />,
                  code: ({ className, children, ...props }) => {
                    const isBlockCode = className?.includes('language-');
                    if (isBlockCode) {
                      return (
                        <code
                          className="block overflow-x-auto rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-xs leading-6 text-emerald-200"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code
                        className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-200"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre: ({ ...props }) => <pre className="mb-4" {...props} />,
                  a: ({ ...props }) => (
                    <a
                      className="text-sky-300 underline underline-offset-2 hover:text-sky-200"
                      target="_blank"
                      rel="noreferrer"
                      {...props}
                    />
                  ),
                  blockquote: ({ ...props }) => (
                    <blockquote className="mb-4 border-l-4 border-gray-600 pl-4 italic text-gray-300" {...props} />
                  ),
                  hr: ({ ...props }) => <hr className="my-5 border-gray-700" {...props} />,
                  table: ({ ...props }) => (
                    <div className="mb-5 overflow-x-auto rounded-lg border border-gray-700">
                      <table className="min-w-full border-collapse text-left text-sm" {...props} />
                    </div>
                  ),
                  thead: ({ ...props }) => <thead className="bg-gray-800/80" {...props} />,
                  tbody: ({ ...props }) => <tbody className="bg-gray-900" {...props} />,
                  tr: ({ ...props }) => <tr className="border-b border-gray-700 last:border-b-0" {...props} />,
                  th: ({ ...props }) => (
                    <th className="px-3 py-2 font-semibold text-gray-100 whitespace-nowrap" {...props} />
                  ),
                  td: ({ ...props }) => <td className="px-3 py-2 text-gray-200 align-top" {...props} />,
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
