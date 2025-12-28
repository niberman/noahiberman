import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, supabaseUrl } from '@/lib/supabase';
import type { BlogPost, BlogImage } from '@/lib/supabase';

// Fetch published blog posts (for public site)
export function useBlogPosts() {
  return useQuery({
    queryKey: ['blog-posts', 'published'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data as BlogPost[];
    },
  });
}

// Fetch all blog posts (for dashboard)
export function useAllBlogPosts() {
  return useQuery({
    queryKey: ['blog-posts', 'all'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BlogPost[];
    },
  });
}

// Fetch a single blog post by slug
export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: ['blog-posts', slug],
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
    enabled: !!slug,
  });
}

// Create a new blog post
export function useCreateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase
        .from('blog_posts')
        .insert(post)
        .select()
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    },
  });
}

// Update a blog post
export function useUpdateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPost> & { id: string }) => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { data, error } = await supabase
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts', data.slug] });
    },
  });
}

// Delete a blog post
export function useDeleteBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    },
  });
}

// Upload an image to the blog-images bucket
export function useUploadBlogImage() {
  return useMutation({
    mutationFn: async ({ file, postId }: { file: File; postId?: string }) => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${postId || 'draft'}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath,
      };
    },
  });
}

// Delete an image from the blog-images bucket
export function useDeleteBlogImage() {
  return useMutation({
    mutationFn: async (imageUrl: string) => {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      // Extract file path from URL
      const bucketUrl = `${supabaseUrl}/storage/v1/object/public/blog-images/`;
      const filePath = imageUrl.replace(bucketUrl, '');

      const { error } = await supabase.storage
        .from('blog-images')
        .remove([filePath]);

      if (error) throw error;
    },
  });
}

// Helper to generate slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}




