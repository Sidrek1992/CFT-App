import React, { useCallback, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import {
    Bold, Italic, List, ListOrdered, Heading1, Heading2,
    AlignLeft, AlignCenter, AlignRight, Link as LinkIcon,
    Undo2, Redo2,
} from 'lucide-react';

interface EmailEditorProps {
    content: string;
    onChange: (content: string) => void;
    disabled?: boolean;
}

export interface EmailEditorHandle {
    /** Insert text/HTML at the current cursor position inside Tiptap */
    insertContent: (text: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    const btnClass = (isActive: boolean) =>
        `p-2 rounded-lg transition-colors ${isActive
            ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400'
            : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-slate-200'
        } disabled:opacity-50`;

    // Link insertion: prompt the user for a URL (no native OS dialog because this
    // is a standard browser prompt for a URL, not for text content — but we use
    // a simple inline approach to keep dependencies minimal).
    const setLink = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('URL del enlace:', previousUrl ?? 'https://');

        if (url === null) return; // cancelled
        if (url.trim() === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    }, [editor]);

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-dark-900/50 rounded-t-xl z-20 sticky top-0 backdrop-blur-sm">

            {/* Headings */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                disabled={!editor.can().chain().focus().toggleHeading({ level: 1 }).run()}
                className={btnClass(editor.isActive('heading', { level: 1 }))}
                title="Título 1"
            >
                <Heading1 className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
                className={btnClass(editor.isActive('heading', { level: 2 }))}
                title="Título 2"
            >
                <Heading2 className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-900/10 dark:bg-white/10 mx-1 self-center" />

            {/* Inline formatting */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={btnClass(editor.isActive('bold'))}
                title="Negrita"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={btnClass(editor.isActive('italic'))}
                title="Cursiva"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={setLink}
                className={btnClass(editor.isActive('link'))}
                title="Insertar / editar enlace"
            >
                <LinkIcon className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-900/10 dark:bg-white/10 mx-1 self-center" />

            {/* Text alignment */}
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={btnClass(editor.isActive({ textAlign: 'left' }))}
                title="Alinear a la izquierda"
            >
                <AlignLeft className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={btnClass(editor.isActive({ textAlign: 'center' }))}
                title="Centrar"
            >
                <AlignCenter className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={btnClass(editor.isActive({ textAlign: 'right' }))}
                title="Alinear a la derecha"
            >
                <AlignRight className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-900/10 dark:bg-white/10 mx-1 self-center" />

            {/* Lists */}
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                disabled={!editor.can().chain().focus().toggleBulletList().run()}
                className={btnClass(editor.isActive('bulletList'))}
                title="Lista desordenada"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                disabled={!editor.can().chain().focus().toggleOrderedList().run()}
                className={btnClass(editor.isActive('orderedList'))}
                title="Lista ordenada"
            >
                <ListOrdered className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-slate-900/10 dark:bg-white/10 mx-1 self-center" />

            {/* History */}
            <button
                type="button"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className={btnClass(false)}
                title="Deshacer (Ctrl+Z)"
            >
                <Undo2 className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className={btnClass(false)}
                title="Rehacer (Ctrl+Y)"
            >
                <Redo2 className="w-4 h-4" />
            </button>
        </div>
    );
};

export const EmailEditor = forwardRef<EmailEditorHandle, EmailEditorProps>(
  ({ content, onChange, disabled = false }, ref) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false, // We use custom heading extension
            }),
            Heading.configure({
                levels: [1, 2, 3],
            }),
            Link.configure({
                openOnClick: false,          // Don't navigate away in the editor
                HTMLAttributes: {
                    class: 'text-primary-600 dark:text-primary-400 underline cursor-pointer',
                    rel: 'noopener noreferrer',
                    target: '_blank',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content,
        editorProps: {
            attributes: {
                class:
                    'p-4 outline-none min-h-[250px] max-h-[500px] overflow-y-auto prose prose-slate dark:prose-invert prose-sm sm:prose-base max-w-none custom-scrollbar ' +
                    (disabled ? 'opacity-70 cursor-not-allowed' : ''),
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editable: !disabled,
    });

    // Sync content from outside (e.g. when a new AI template is generated)
    React.useEffect(() => {
        if (editor && editor.getHTML() !== content && !editor.isFocused) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    // Expose insertContent to parent components via ref
    useImperativeHandle(ref, () => ({
        insertContent: (text: string) => {
            if (!editor) return;
            editor.chain().focus().insertContent(text).run();
        },
    }), [editor]);

    return (
        <div
            className={`relative flex flex-col border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-dark-900/40 shadow-inner ${disabled ? 'opacity-80' : ''}`}
        >
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
  }
);
