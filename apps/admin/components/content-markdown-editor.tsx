"use client";

import { useRef, useState } from "react";
import {
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  SaveIcon,
} from "lucide-react";
import type { AppContentPageKey } from "@credit-union/shared";
import type { ComponentType } from "react";

import { saveAppContentPageAction } from "../app/actions";
import { AdminFormField } from "./admin-form-field";
import { Button } from "./ui/button";
import { FieldGroup } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

type ContentMarkdownEditorProps = {
  content: string;
  contentKey: AppContentPageKey;
  title: string;
};

type ToolbarAction = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  run: () => void;
};

export function ContentMarkdownEditor({
  content,
  contentKey,
  title,
}: ContentMarkdownEditorProps) {
  const [currentContent, setCurrentContent] = useState(content);
  const [currentTitle, setCurrentTitle] = useState(title);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  function replaceSelection(nextValue: string, selectionStart: number, selectionEnd: number) {
    const before = currentContent.slice(0, selectionStart);
    const after = currentContent.slice(selectionEnd);
    setCurrentContent(`${before}${nextValue}${after}`);

    requestAnimationFrame(() => {
      const textarea = textAreaRef.current;

      if (!textarea) {
        return;
      }

      const cursor = selectionStart + nextValue.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function wrapSelection(prefix: string, suffix = prefix, placeholder = "text") {
    const textarea = textAreaRef.current;

    if (!textarea) {
      return;
    }

    const selected = currentContent.slice(textarea.selectionStart, textarea.selectionEnd) || placeholder;
    replaceSelection(`${prefix}${selected}${suffix}`, textarea.selectionStart, textarea.selectionEnd);
  }

  function prefixSelectedLines(prefix: string) {
    const textarea = textAreaRef.current;

    if (!textarea) {
      return;
    }

    const selected = currentContent.slice(textarea.selectionStart, textarea.selectionEnd) || "List item";
    const nextValue = selected
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");

    replaceSelection(nextValue, textarea.selectionStart, textarea.selectionEnd);
  }

  const toolbarActions: ToolbarAction[] = [
    { icon: Heading1Icon, label: "Heading 1", run: () => prefixSelectedLines("# ") },
    { icon: Heading2Icon, label: "Heading 2", run: () => prefixSelectedLines("## ") },
    { icon: BoldIcon, label: "Bold", run: () => wrapSelection("**") },
    { icon: ItalicIcon, label: "Italic", run: () => wrapSelection("*") },
    { icon: ListIcon, label: "Bullet list", run: () => prefixSelectedLines("- ") },
    { icon: ListOrderedIcon, label: "Numbered list", run: () => prefixSelectedLines("1. ") },
    { icon: LinkIcon, label: "Link", run: () => wrapSelection("[", "](https://example.com)", "link text") },
  ];

  return (
    <form action={saveAppContentPageAction}>
      <input name="key" type="hidden" value={contentKey} />
      <FieldGroup className="gap-4">
        <AdminFormField htmlFor={`${contentKey}-title`} label="Page title">
          <Input
            id={`${contentKey}-title`}
            name="title"
            onChange={(event) => setCurrentTitle(event.target.value)}
            required
            value={currentTitle}
          />
        </AdminFormField>
        <div className="flex flex-wrap gap-2">
          {toolbarActions.map((action) => {
            const Icon = action.icon;

            return (
              <Button
                aria-label={action.label}
                key={action.label}
                onClick={action.run}
                size="icon-sm"
                title={action.label}
                type="button"
                variant="outline"
              >
                <Icon />
              </Button>
            );
          })}
        </div>
        <AdminFormField htmlFor={`${contentKey}-content`} label="Content">
          <Textarea
            className="min-h-64 font-mono"
            id={`${contentKey}-content`}
            name="content"
            onChange={(event) => setCurrentContent(event.target.value)}
            ref={textAreaRef}
            required
            value={currentContent}
          />
        </AdminFormField>
        <Button type="submit">
          <SaveIcon data-icon="inline-start" />
          Save Content
        </Button>
      </FieldGroup>
    </form>
  );
}
