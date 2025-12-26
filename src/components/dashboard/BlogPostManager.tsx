import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Upload,
  X,
  GripVertical,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  useAllBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  useUploadBlogImage,
  useDeleteBlogImage,
  generateSlug,
} from "@/hooks/use-supabase-blog";
import type { BlogPost, BlogImage } from "@/lib/supabase";

interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string;
  images: BlogImage[];
  is_published: boolean;
}

const defaultFormData: PostFormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  tags: "",
  images: [],
  is_published: false,
};

export default function BlogPostManager() {
  const { data: posts, isLoading } = useAllBlogPosts();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const deletePost = useDeleteBlogPost();
  const uploadImage = useUploadBlogImage();
  const deleteImage = useDeleteBlogImage();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState<PostFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openEditor = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        content: post.content || "",
        tags: post.tags?.join(", ") || "",
        images: post.images || [],
        is_published: post.is_published,
      });
    } else {
      setEditingPost(null);
      setFormData(defaultFormData);
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingPost(null);
    setFormData(defaultFormData);
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: editingPost ? prev.slug : generateSlug(title),
    }));
  };

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsUploading(true);
      const newImages: BlogImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;

        try {
          const result = await uploadImage.mutateAsync({
            file,
            postId: editingPost?.id,
          });

          newImages.push({
            url: result.url,
            alt: file.name.replace(/\.[^/.]+$/, ""),
            caption: "",
            order: formData.images.length + newImages.length,
          });
        } catch (error) {
          console.error("Failed to upload image:", error);
        }
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
      setIsUploading(false);
    },
    [editingPost?.id, formData.images.length, uploadImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleRemoveImage = async (index: number) => {
    const image = formData.images[index];
    try {
      await deleteImage.mutateAsync(image.url);
    } catch (error) {
      console.error("Failed to delete image from storage:", error);
    }

    setFormData((prev) => ({
      ...prev,
      images: prev.images
        .filter((_, i) => i !== index)
        .map((img, i) => ({ ...img, order: i })),
    }));
  };

  const handleImageAltChange = (index: number, alt: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => (i === index ? { ...img, alt } : img)),
    }));
  };

  const handleImageCaptionChange = (index: number, caption: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, i) =>
        i === index ? { ...img, caption } : img
      ),
    }));
  };

  const moveImage = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= formData.images.length) return;

    const newImages = [...formData.images];
    [newImages[fromIndex], newImages[toIndex]] = [
      newImages[toIndex],
      newImages[fromIndex],
    ];
    setFormData((prev) => ({
      ...prev,
      images: newImages.map((img, i) => ({ ...img, order: i })),
    }));
  };

  const handleSave = async () => {
    const postData = {
      title: formData.title,
      slug: formData.slug,
      excerpt: formData.excerpt || null,
      content: formData.content || null,
      tags: formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images: formData.images,
      is_published: formData.is_published,
      published_at: formData.is_published
        ? editingPost?.published_at || new Date().toISOString()
        : null,
    };

    try {
      if (editingPost) {
        await updatePost.mutateAsync({ id: editingPost.id, ...postData });
      } else {
        await createPost.mutateAsync(postData);
      }
      closeEditor();
    } catch (error) {
      console.error("Failed to save post:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    // Delete all images associated with the post
    const post = posts?.find((p) => p.id === deleteConfirmId);
    if (post?.images) {
      for (const image of post.images) {
        try {
          await deleteImage.mutateAsync(image.url);
        } catch (error) {
          console.error("Failed to delete image:", error);
        }
      }
    }

    await deletePost.mutateAsync(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not published";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <Card className="bg-card/95 backdrop-blur">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-secondary flex-shrink-0" />
              <CardTitle className="text-lg sm:text-xl">Blog Posts</CardTitle>
            </div>
            <Button
              onClick={() => openEditor()}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </div>
          <CardDescription className="text-sm">
            Create and manage your blog posts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !posts || posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No blog posts yet</p>
              <p className="text-sm mt-1">Create your first post to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{post.title}</h3>
                      <Badge
                        variant={post.is_published ? "default" : "secondary"}
                        className={
                          post.is_published
                            ? "bg-green-500/20 text-green-400 border-green-500/40"
                            : ""
                        }
                      >
                        {post.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {post.excerpt || "No excerpt"}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{formatDate(post.published_at)}</span>
                      {post.images && post.images.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {post.images.length} image{post.images.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditor(post)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(post.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? "Edit Post" : "Create New Post"}
            </DialogTitle>
            <DialogDescription>
              {editingPost
                ? "Update your blog post details"
                : "Fill in the details for your new blog post"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter post title"
              />
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="post-url-slug"
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly identifier for this post
              </p>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                }
                placeholder="Brief summary of the post"
                rows={2}
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Write your post content here (supports Markdown)"
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* Images */}
            <div className="space-y-3">
              <Label>Images</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver
                    ? "border-secondary bg-secondary/10"
                    : "border-border hover:border-secondary/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop images here, or
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Browse Files
                    </Button>
                  </>
                )}
              </div>

              {/* Image List */}
              {formData.images.length > 0 && (
                <div className="space-y-3">
                  {formData.images.map((image, index) => (
                    <div
                      key={image.url}
                      className="flex gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveImage(index, "up")}
                            disabled={index === 0}
                          >
                            <GripVertical className="h-3 w-3" />
                          </Button>
                        </div>
                        <img
                          src={image.url}
                          alt={image.alt || ""}
                          className="w-16 h-16 object-cover rounded"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={image.alt || ""}
                          onChange={(e) =>
                            handleImageAltChange(index, e.target.value)
                          }
                          placeholder="Alt text"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={image.caption || ""}
                          onChange={(e) =>
                            handleImageCaptionChange(index, e.target.value)
                          }
                          placeholder="Caption (optional)"
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tags: e.target.value }))
                }
                placeholder="aviation, technology, travel (comma-separated)"
              />
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label htmlFor="publish-toggle">Publish Post</Label>
                <p className="text-sm text-muted-foreground">
                  Make this post visible on your site
                </p>
              </div>
              <Switch
                id="publish-toggle"
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_published: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.title ||
                !formData.slug ||
                createPost.isPending ||
                updatePost.isPending
              }
            >
              {createPost.isPending || updatePost.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingPost ? (
                "Update Post"
              ) : (
                "Create Post"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone and will also delete all associated images.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

