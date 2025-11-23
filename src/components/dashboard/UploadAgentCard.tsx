import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Sparkles, Copy, RefreshCw, Save, Image as ImageIcon, Loader2 } from "lucide-react";

export const UploadAgentCard = () => {
  const [textInput, setTextInput] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedPost, setGeneratedPost] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!textInput.trim() && !uploadedImage) return;

    setIsGenerating(true);

    // Simulate AI generation with mock data
    setTimeout(() => {
      const mockPost = `🚀 Exciting Update!

${textInput || "Just captured this amazing moment. Sometimes the best experiences come from taking a leap of faith."}

What has been your biggest win this week? Drop it in the comments! 👇

#Innovation #Growth #Entrepreneurship`;
      
      setGeneratedPost(mockPost);
      setIsGenerating(false);
    }, 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPost);
  };

  const handleReset = () => {
    setTextInput("");
    setUploadedImage(null);
    setGeneratedPost("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="hover:shadow-elegant transition-shadow duration-300 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            <CardTitle>AI Post Generator</CardTitle>
          </div>
          {generatedPost && (
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              Generated
            </Badge>
          )}
        </div>
        <CardDescription>Upload content and generate engaging social posts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-input">Text Snippet</Label>
              <Textarea
                id="text-input"
                placeholder="Share your thoughts, insights, or key points..."
                rows={4}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Upload Image (Optional)</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                {uploadedImage ? "Change Image" : "Choose Image"}
              </Button>

              {uploadedImage && (
                <div className="mt-3 relative rounded-md overflow-hidden">
                  <img
                    src={uploadedImage}
                    alt="Uploaded"
                    className="w-full h-40 object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                    onClick={() => {
                      setUploadedImage(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating || (!textInput.trim() && !uploadedImage)}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Post
                </>
              )}
            </Button>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            <div>
              <Label>Generated Post</Label>
              {generatedPost ? (
                <div className="mt-2 p-4 rounded-md bg-muted/50 min-h-[200px] relative animate-fade-in">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {generatedPost}
                  </pre>
                </div>
              ) : (
                <div className="mt-2 p-4 rounded-md bg-muted/30 min-h-[200px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">
                    Your AI-generated post will appear here
                  </p>
                </div>
              )}
            </div>

            {generatedPost && (
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

