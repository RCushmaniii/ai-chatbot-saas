"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Save, RotateCcw } from "lucide-react";

const DEFAULT_INSTRUCTIONS = `I am an AI assistant for New York English Teacher (nyenglishteacher.com), a professional English coaching service run by Robert Cushman.

IMPORTANT INSTRUCTIONS - RISK-AVERSE APPROACH:

1. **Language Matching**: Always respond in the same language the user writes in (Spanish or English).

2. **Scope of Knowledge**: 
   - I can ONLY provide information based on my knowledge base search results.
   - If asked about topics unrelated to English coaching services, I politely redirect: "I must be careful here and can only provide information directly related to English coaching services. If you believe your question is related, please rephrase it clearly so I can assist you better."

3. **Cautious Language** (when using knowledge base results):
   - Use phrases like "Based on my search results, my interpretation is that..."
   - Say "here is what it suggests..." instead of "here is how you do it"
   - Use "my interpretation of the search results are that..." instead of "the search results say"

4. **Missing Information**:
   - If the answer is not in the search results, say: "Unfortunately, I could not find information about [topic] in the search results. If you ask your question more precisely, I might be able to find it!"
   - After two failed attempts, offer to escalate: "I apologize for not finding what you need. Would you like me to connect you with Robert directly?"

5. **Booking Requests**:
   - For questions about booking, starting classes, or contacting Robert, respond: "I'd be happy to help you take the first step toward booking a class! To get started, please visit our booking page here: https://www.nyenglishteacher.com/en/book/. There, you can reserve a free 30-minute consultation."

6. **URL Attribution**:
   - When using information from the knowledge base, ALWAYS include source URLs at the end in a "Learn more:" section.

7. **Professional Tone**:
   - Be warm and encouraging, but maintain professional boundaries.
   - Focus on understanding their goals and how coaching can help them succeed.`;

export function AdminSystemInstructions() {
  const [botName, setBotName] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        if (response.status === 404) {
          // No settings yet, use defaults
          setCustomInstructions(DEFAULT_INSTRUCTIONS);
          setBotName("New York English Teacher");
          return;
        }
        throw new Error("Failed to load settings");
      }
      const data = await response.json();
      setBotName(data.botName || "New York English Teacher");
      setCustomInstructions(data.customInstructions || DEFAULT_INSTRUCTIONS);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
      setCustomInstructions(DEFAULT_INSTRUCTIONS);
      setBotName("New York English Teacher");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          botName,
          customInstructions,
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      toast.success("Settings saved successfully!");
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        "Are you sure you want to reset to default instructions? This will overwrite your current custom instructions."
      )
    ) {
      setCustomInstructions(DEFAULT_INSTRUCTIONS);
      setHasChanges(true);
      toast.info("Instructions reset to default. Click Save to apply.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bot Identity</CardTitle>
          <CardDescription>
            Configure your chatbot's name and personality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-name">Bot Name</Label>
            <Input
              id="bot-name"
              placeholder="e.g., New York English Teacher"
              value={botName}
              onChange={(e) => {
                setBotName(e.target.value);
                setHasChanges(true);
              }}
            />
            <p className="text-sm text-muted-foreground">
              This name will be used when the bot introduces itself.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Instructions</CardTitle>
          <CardDescription>
            Customize how your chatbot behaves and responds to users. These
            instructions guide the AI's personality, tone, and knowledge scope.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructions">Custom Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Enter custom system instructions..."
              value={customInstructions}
              onChange={(e) => {
                setCustomInstructions(e.target.value);
                setHasChanges(true);
              }}
              rows={20}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              These instructions are added to the system prompt. Use them to
              define the bot's personality, scope, and behavior rules.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>

            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Default
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips for Writing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Be specific:</strong> Clearly define what the bot should
            and shouldn't do
          </p>
          <p>
            • <strong>Use examples:</strong> Show the bot how to respond in
            different scenarios
          </p>
          <p>
            • <strong>Set boundaries:</strong> Define the scope of knowledge
            and when to escalate to humans
          </p>
          <p>
            • <strong>Define tone:</strong> Specify if the bot should be
            formal, casual, encouraging, etc.
          </p>
          <p>
            • <strong>Risk-averse approach:</strong> Include guidelines for
            handling uncertain or out-of-scope questions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
