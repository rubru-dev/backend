"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, ImageIcon, Youtube as YoutubeIcon,
  Undo, Redo, Type,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  uploadImageFn?: (file: File) => Promise<string>; // returns image URL
}

export function RichTextEditor({ value, onChange, uploadImageFn }: Props) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [ytUrl, setYtUrl] = useState("");
  const [showYt, setShowYt] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false }),
      Youtube.configure({ controls: true, nocookie: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Tulis konten artikel di sini..." }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  });

  // Sync external value changes (e.g. when editing loads)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  const btn = (active: boolean, title: string, onClick: () => void, children: React.ReactNode) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${active ? "bg-slate-200 text-slate-900" : "text-slate-600"}`}
    >
      {children}
    </button>
  );

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadImageFn) return;
    try {
      const url = await uploadImageFn(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      alert("Gagal upload gambar");
    }
    e.target.value = "";
  }

  function insertYoutube() {
    if (!ytUrl) return;
    editor.chain().focus().setYoutubeVideo({ src: ytUrl }).run();
    setYtUrl("");
    setShowYt(false);
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-slate-200 bg-slate-50">
        {/* History */}
        {btn(false, "Undo", () => editor.chain().focus().undo().run(), <Undo size={15} />)}
        {btn(false, "Redo", () => editor.chain().focus().redo().run(), <Redo size={15} />)}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Headings */}
        {btn(editor.isActive("heading", { level: 1 }), "H1", () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 size={15} />)}
        {btn(editor.isActive("heading", { level: 2 }), "H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 size={15} />)}
        {btn(editor.isActive("heading", { level: 3 }), "H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 size={15} />)}
        {btn(editor.isActive("paragraph"), "Paragraph", () => editor.chain().focus().setParagraph().run(), <Type size={15} />)}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Formatting */}
        {btn(editor.isActive("bold"), "Bold", () => editor.chain().focus().toggleBold().run(), <Bold size={15} />)}
        {btn(editor.isActive("italic"), "Italic", () => editor.chain().focus().toggleItalic().run(), <Italic size={15} />)}
        {btn(editor.isActive("underline"), "Underline", () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon size={15} />)}
        {btn(editor.isActive("strike"), "Strikethrough", () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={15} />)}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Lists */}
        {btn(editor.isActive("bulletList"), "Bullet List", () => editor.chain().focus().toggleBulletList().run(), <List size={15} />)}
        {btn(editor.isActive("orderedList"), "Numbered List", () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={15} />)}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Alignment */}
        {btn(editor.isActive({ textAlign: "left" }), "Align Left", () => editor.chain().focus().setTextAlign("left").run(), <AlignLeft size={15} />)}
        {btn(editor.isActive({ textAlign: "center" }), "Align Center", () => editor.chain().focus().setTextAlign("center").run(), <AlignCenter size={15} />)}
        {btn(editor.isActive({ textAlign: "right" }), "Align Right", () => editor.chain().focus().setTextAlign("right").run(), <AlignRight size={15} />)}
        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Image */}
        {uploadImageFn && (
          <>
            {btn(false, "Insert Image", () => imgInputRef.current?.click(), <ImageIcon size={15} />)}
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </>
        )}

        {/* YouTube */}
        <button
          type="button"
          title="Embed YouTube"
          onClick={() => setShowYt((v) => !v)}
          className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${showYt ? "bg-slate-200" : "text-slate-600"}`}
        >
          <YoutubeIcon size={15} />
        </button>
      </div>

      {/* YouTube embed input */}
      {showYt && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border-b border-yellow-200">
          <input
            type="text"
            value={ytUrl}
            onChange={(e) => setYtUrl(e.target.value)}
            placeholder="Paste link YouTube (https://youtu.be/...)"
            className="flex-1 text-sm border border-slate-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400"
            onKeyDown={(e) => e.key === "Enter" && insertYoutube()}
          />
          <Button type="button" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={insertYoutube}>
            Embed
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowYt(false)}>Batal</Button>
        </div>
      )}

      {/* Editor area */}
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}
