"use client"

import { useEffect, type ReactNode } from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { Color, TextStyle } from "@tiptap/extension-text-style"
import { Button } from "@/components/ui/button"
import { htmlFromLegacyPlain } from "@/lib/isu-notes-html"
import { cn } from "@/lib/utils"
import {
  MdChecklist,
  MdFormatBold,
  MdFormatIndentDecrease,
  MdFormatIndentIncrease,
  MdFormatItalic,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatQuote,
  MdFormatUnderlined,
  MdRedo,
  MdTitle,
  MdUndo,
} from "react-icons/md"

const TEXT_COLORS = [
  { label: "Negru", value: "#1f2937" },
  { label: "Roșu", value: "#dc2626" },
  { label: "Albastru", value: "#2563eb" },
  { label: "Verde", value: "#16a34a" },
  { label: "Portocaliu", value: "#ea580c" },
] as const

type IsuNoteEditorProps = {
  content: string
  readOnly?: boolean
  onChange: (html: string) => void
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "ghost"}
      className="h-8 px-2"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  )
}

function EditorToolbar({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  const currentColor = editor.getAttributes("textStyle").color as string | undefined

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-1">
      <ToolbarButton
        label="Anulează"
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <MdUndo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Refă"
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <MdRedo className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <MdFormatBold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <MdFormatItalic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Subliniat"
        active={editor.isActive("underline")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <MdFormatUnderlined className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="Titlu 1"
        active={editor.isActive("heading", { level: 1 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <MdTitle className="h-5 w-5" />
        <span className="text-[10px] font-bold">1</span>
      </ToolbarButton>
      <ToolbarButton
        label="Titlu 2"
        active={editor.isActive("heading", { level: 2 })}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <MdTitle className="h-4 w-4" />
        <span className="text-[10px] font-bold">2</span>
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label="Listă"
        active={editor.isActive("bulletList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <MdFormatListBulleted className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Listă numerotată"
        active={editor.isActive("orderedList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <MdFormatListNumbered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Checklist"
        active={editor.isActive("taskList")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <MdChecklist className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Citat"
        active={editor.isActive("blockquote")}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <MdFormatQuote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Indent"
        disabled={disabled}
        onClick={() => editor.chain().focus().sinkListItem("listItem").sinkListItem("taskItem").run()}
      >
        <MdFormatIndentIncrease className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Scade indent"
        disabled={disabled}
        onClick={() => editor.chain().focus().liftListItem("listItem").liftListItem("taskItem").run()}
      >
        <MdFormatIndentDecrease className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      {TEXT_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          title={color.label}
          aria-label={color.label}
          disabled={disabled}
          className={cn(
            "h-5 w-5 rounded-full border border-black/10 disabled:opacity-40",
            currentColor === color.value && "ring-2 ring-offset-1 ring-blue-500",
          )}
          style={{ backgroundColor: color.value }}
          onClick={() => {
            if (color.value === "#1f2937") editor.chain().focus().unsetColor().run()
            else editor.chain().focus().setColor(color.value).run()
          }}
        />
      ))}
    </div>
  )
}

export function IsuNoteEditor({ content, readOnly = false, onChange }: IsuNoteEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      Placeholder.configure({ placeholder: "Scrieți nota…" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
    ],
    content: htmlFromLegacyPlain(content),
    editorProps: {
      attributes: {
        class: "isu-note-prose min-h-[420px] px-3 py-3 text-base leading-relaxed focus:outline-none",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!readOnly)
  }, [editor, readOnly])

  if (!editor) {
    return <div className="min-h-[420px] rounded-md border bg-muted/20" />
  }

  return (
    <div className={cn("isu-note-editor overflow-hidden rounded-md border bg-white", readOnly && "opacity-95")}>
      <EditorToolbar editor={editor} disabled={readOnly} />
      <EditorContent editor={editor} />
    </div>
  )
}
