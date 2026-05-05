import { z } from 'zod';

export const articleFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  folderId: z.string().nullable(),
  tags: z.array(z.string()).max(20, 'Maximum 20 tags allowed'),
  body: z.string().max(50_000, 'Body must be at most 50000 characters'),
});

export type ArticleFormData = z.infer<typeof articleFormSchema>;

export const ARTICLE_FORM_DEFAULTS: ArticleFormData = {
  title: '',
  folderId: null,
  tags: [],
  body: '',
};
