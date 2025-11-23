"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminKnowledgeBase } from "@/components/admin-knowledge-base";
import { AdminWebsiteScraping } from "@/components/admin-website-scraping";
import { AdminSystemInstructions } from "@/components/admin-system-instructions";
import { AdminStarterQuestions } from "@/components/admin-starter-questions";
import { Database, Globe, Settings, MessageSquare } from "lucide-react";

export function AdminTabs() {
  return (
    <Tabs defaultValue="manual" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="manual" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline">Manual Content</span>
          <span className="sm:hidden">Manual</span>
        </TabsTrigger>
        <TabsTrigger value="website" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">Website Scraping</span>
          <span className="sm:hidden">Website</span>
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Bot Settings</span>
          <span className="sm:hidden">Settings</span>
        </TabsTrigger>
        <TabsTrigger value="prompts" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Instructions</span>
          <span className="sm:hidden">Prompts</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="mt-6">
        <AdminKnowledgeBase />
      </TabsContent>

      <TabsContent value="website" className="mt-6">
        <AdminWebsiteScraping />
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <AdminStarterQuestions />
      </TabsContent>

      <TabsContent value="prompts" className="mt-6">
        <AdminSystemInstructions />
      </TabsContent>
    </Tabs>
  );
}
