import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Plus, Edit, Trash2, ArrowLeft, Users, FileText, CreditCard, Upload, Image } from "lucide-react";
import { format } from "date-fns";
import { UserSubscriptionManager } from "@/components/admin/UserSubscriptionManager";

interface Author {
  id: string;
  first_name: string;
  last_name: string;
  expertise_area: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface BlogPost {
  id: string;
  author_id: string | null;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  category: string | null;
  featured_image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  authors?: Author | null;
}

const CATEGORIES = ["HR Tips", "AI & Recruitment", "Company News", "Industry Trends", "Product Updates"];

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Author form state
  const [authorDialogOpen, setAuthorDialogOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [authorForm, setAuthorForm] = useState({
    first_name: "",
    last_name: "",
    expertise_area: "",
    linkedin_url: "",
    avatar_url: "",
  });

  // Blog form state
  const [blogDialogOpen, setBlogDialogOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [blogForm, setBlogForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "",
    author_id: "",
    featured_image_url: "",
    published: false,
  });
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [uploadingAuthorAvatar, setUploadingAuthorAvatar] = useState(false);
  const featuredImageInputRef = useRef<HTMLInputElement>(null);
  const authorAvatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAuthors();
      fetchBlogPosts();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast.error("Unauthorized access");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  const fetchAuthors = async () => {
    const { data, error } = await supabase
      .from("authors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch authors");
      return;
    }
    setAuthors(data || []);
  };

  const fetchBlogPosts = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*, authors(*)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch blog posts");
      return;
    }
    setBlogPosts(data || []);
  };

  // Author CRUD
  const handleAuthorSubmit = async () => {
    if (!authorForm.first_name || !authorForm.last_name) {
      toast.error("First name and last name are required");
      return;
    }

    if (editingAuthor) {
      const { error } = await supabase
        .from("authors")
        .update({
          first_name: authorForm.first_name,
          last_name: authorForm.last_name,
          expertise_area: authorForm.expertise_area || null,
          linkedin_url: authorForm.linkedin_url || null,
          avatar_url: authorForm.avatar_url || null,
        })
        .eq("id", editingAuthor.id);

      if (error) {
        toast.error("Failed to update author");
        return;
      }
      toast.success("Author updated");
    } else {
      const { error } = await supabase.from("authors").insert({
        first_name: authorForm.first_name,
        last_name: authorForm.last_name,
        expertise_area: authorForm.expertise_area || null,
        linkedin_url: authorForm.linkedin_url || null,
        avatar_url: authorForm.avatar_url || null,
      });

      if (error) {
        toast.error("Failed to create author");
        return;
      }
      toast.success("Author created");
    }

    setAuthorDialogOpen(false);
    setEditingAuthor(null);
    resetAuthorForm();
    fetchAuthors();
  };

  const handleDeleteAuthor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this author?")) return;

    const { error } = await supabase.from("authors").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete author");
      return;
    }
    toast.success("Author deleted");
    fetchAuthors();
  };

  const resetAuthorForm = () => {
    setAuthorForm({
      first_name: "",
      last_name: "",
      expertise_area: "",
      linkedin_url: "",
      avatar_url: "",
    });
  };

  // Image upload handlers
  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFeaturedImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `blog-${Date.now()}.${fileExt}`;
      const filePath = `featured/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setBlogForm({ ...blogForm, featured_image_url: publicUrl });
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingFeaturedImage(false);
    }
  };

  const handleAuthorAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAuthorAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      setAuthorForm({ ...authorForm, avatar_url: publicUrl });
      toast.success("Avatar uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar");
    } finally {
      setUploadingAuthorAvatar(false);
    }
  };

  const openAuthorEdit = (author: Author) => {
    setEditingAuthor(author);
    setAuthorForm({
      first_name: author.first_name,
      last_name: author.last_name,
      expertise_area: author.expertise_area || "",
      linkedin_url: author.linkedin_url || "",
      avatar_url: author.avatar_url || "",
    });
    setAuthorDialogOpen(true);
  };

  // Blog CRUD
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleBlogSubmit = async () => {
    if (!blogForm.title || !blogForm.content) {
      toast.error("Title and content are required");
      return;
    }

    const slug = generateSlug(blogForm.title);
    const published_at = blogForm.published ? new Date().toISOString() : null;

    if (editingBlog) {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          title: blogForm.title,
          slug,
          content: blogForm.content,
          excerpt: blogForm.excerpt || null,
          category: blogForm.category || null,
          author_id: blogForm.author_id || null,
          featured_image_url: blogForm.featured_image_url || null,
          published: blogForm.published,
          published_at: blogForm.published && !editingBlog.published_at ? published_at : editingBlog.published_at,
        })
        .eq("id", editingBlog.id);

      if (error) {
        toast.error("Failed to update blog post");
        return;
      }
      toast.success("Blog post updated");
    } else {
      const { error } = await supabase.from("blog_posts").insert({
        title: blogForm.title,
        slug,
        content: blogForm.content,
        excerpt: blogForm.excerpt || null,
        category: blogForm.category || null,
        author_id: blogForm.author_id || null,
        featured_image_url: blogForm.featured_image_url || null,
        published: blogForm.published,
        published_at,
      });

      if (error) {
        toast.error("Failed to create blog post");
        return;
      }
      toast.success("Blog post created");
    }

    setBlogDialogOpen(false);
    setEditingBlog(null);
    resetBlogForm();
    fetchBlogPosts();
  };

  const handleDeleteBlog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete blog post");
      return;
    }
    toast.success("Blog post deleted");
    fetchBlogPosts();
  };

  const resetBlogForm = () => {
    setBlogForm({
      title: "",
      content: "",
      excerpt: "",
      category: "",
      author_id: "",
      featured_image_url: "",
      published: false,
    });
  };

  const openBlogEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setBlogForm({
      title: blog.title,
      content: blog.content,
      excerpt: blog.excerpt || "",
      category: blog.category || "",
      author_id: blog.author_id || "",
      featured_image_url: blog.featured_image_url || "",
      published: blog.published,
    });
    setBlogDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold text-foreground">Admin Panel</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="blogs" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="blogs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Blogs
            </TabsTrigger>
            <TabsTrigger value="authors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Authors
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          {/* Blogs Tab */}
          <TabsContent value="blogs" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Blog Posts</h2>
              <Dialog open={blogDialogOpen} onOpenChange={(open) => {
                setBlogDialogOpen(open);
                if (!open) {
                  setEditingBlog(null);
                  resetBlogForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Blog Post
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingBlog ? "Edit Blog Post" : "Create Blog Post"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={blogForm.title}
                        onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                        placeholder="Blog post title"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="author">Author</Label>
                        <Select
                          value={blogForm.author_id}
                          onValueChange={(value) => setBlogForm({ ...blogForm, author_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select author" />
                          </SelectTrigger>
                          <SelectContent>
                            {authors.map((author) => (
                              <SelectItem key={author.id} value={author.id}>
                                {author.first_name} {author.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={blogForm.category}
                          onValueChange={(value) => setBlogForm({ ...blogForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excerpt">Excerpt</Label>
                      <Textarea
                        id="excerpt"
                        value={blogForm.excerpt}
                        onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                        placeholder="Short summary for blog list"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Content *</Label>
                      <Textarea
                        id="content"
                        value={blogForm.content}
                        onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                        placeholder="Blog content (supports markdown)"
                        rows={10}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Featured Image</Label>
                      <div className="flex gap-2">
                        <Input
                          value={blogForm.featured_image_url}
                          onChange={(e) => setBlogForm({ ...blogForm, featured_image_url: e.target.value })}
                          placeholder="https://example.com/image.jpg"
                          className="flex-1"
                        />
                        <input
                          type="file"
                          ref={featuredImageInputRef}
                          onChange={handleFeaturedImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => featuredImageInputRef.current?.click()}
                          disabled={uploadingFeaturedImage}
                          className="gap-2"
                        >
                          {uploadingFeaturedImage ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload
                        </Button>
                      </div>
                      {blogForm.featured_image_url && (
                        <div className="mt-2 relative rounded-lg overflow-hidden border border-border">
                          <img
                            src={blogForm.featured_image_url}
                            alt="Featured preview"
                            className="w-full h-32 object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        id="published"
                        checked={blogForm.published}
                        onCheckedChange={(checked) => setBlogForm({ ...blogForm, published: checked })}
                      />
                      <Label htmlFor="published">Published</Label>
                    </div>

                    <Button onClick={handleBlogSubmit} className="w-full">
                      {editingBlog ? "Update Blog Post" : "Create Blog Post"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blogPosts.map((blog) => (
                      <TableRow key={blog.id}>
                        <TableCell className="font-medium">{blog.title}</TableCell>
                        <TableCell>
                          {blog.authors ? `${blog.authors.first_name} ${blog.authors.last_name}` : "-"}
                        </TableCell>
                        <TableCell>{blog.category || "-"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            blog.published 
                              ? "bg-green-100 text-green-700" 
                              : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {blog.published ? "Published" : "Draft"}
                          </span>
                        </TableCell>
                        <TableCell>{format(new Date(blog.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openBlogEdit(blog)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBlog(blog.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {blogPosts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No blog posts yet. Create your first one!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authors Tab */}
          <TabsContent value="authors" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Authors</h2>
              <Dialog open={authorDialogOpen} onOpenChange={(open) => {
                setAuthorDialogOpen(open);
                if (!open) {
                  setEditingAuthor(null);
                  resetAuthorForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Author
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAuthor ? "Edit Author" : "Create Author"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          value={authorForm.first_name}
                          onChange={(e) => setAuthorForm({ ...authorForm, first_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={authorForm.last_name}
                          onChange={(e) => setAuthorForm({ ...authorForm, last_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expertise_area">Expertise Area</Label>
                      <Input
                        id="expertise_area"
                        value={authorForm.expertise_area}
                        onChange={(e) => setAuthorForm({ ...authorForm, expertise_area: e.target.value })}
                        placeholder="e.g., AI & Machine Learning"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                      <Input
                        id="linkedin_url"
                        value={authorForm.linkedin_url}
                        onChange={(e) => setAuthorForm({ ...authorForm, linkedin_url: e.target.value })}
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Avatar</Label>
                      <div className="flex gap-2">
                        <Input
                          value={authorForm.avatar_url}
                          onChange={(e) => setAuthorForm({ ...authorForm, avatar_url: e.target.value })}
                          placeholder="https://example.com/avatar.jpg"
                          className="flex-1"
                        />
                        <input
                          type="file"
                          ref={authorAvatarInputRef}
                          onChange={handleAuthorAvatarUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => authorAvatarInputRef.current?.click()}
                          disabled={uploadingAuthorAvatar}
                          className="gap-2"
                        >
                          {uploadingAuthorAvatar ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload
                        </Button>
                      </div>
                      {authorForm.avatar_url && (
                        <div className="mt-2 flex justify-center">
                          <img
                            src={authorForm.avatar_url}
                            alt="Avatar preview"
                            className="w-20 h-20 rounded-full object-cover border border-border"
                          />
                        </div>
                      )}
                    </div>

                    <Button onClick={handleAuthorSubmit} className="w-full">
                      {editingAuthor ? "Update Author" : "Create Author"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Expertise</TableHead>
                      <TableHead>LinkedIn</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authors.map((author) => (
                      <TableRow key={author.id}>
                        <TableCell className="font-medium">
                          {author.first_name} {author.last_name}
                        </TableCell>
                        <TableCell>{author.expertise_area || "-"}</TableCell>
                        <TableCell>
                          {author.linkedin_url ? (
                            <a href={author.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              View Profile
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell>{format(new Date(author.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openAuthorEdit(author)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteAuthor(author.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {authors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No authors yet. Create your first one!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <UserSubscriptionManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
