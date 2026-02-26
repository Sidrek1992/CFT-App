import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2 } from 'lucide-react';

interface EmailEditorProps {
    content: string;
    onChange: (content: string) => void;
    disabled?: boolean;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) return null;

    const btnClass = (isActive: boolean) =>
        `p-2 rounded-lg transition-colors ${isActive ? 'bg-primary-500/20 text-primary-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'} disabled:opacity-50`;

    return (
        <div className="flex flex-wrap gap-1 p-2 border-b border-white/10 bg-dark-900/50 rounded-t-xl z-20 sticky top-0 backdrop-blur-sm">
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

            <div className="w-px h-6 bg-white/10 mx-1 self-center"></div>

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

            <div className="w-px h-6 bg-white/10 mx-1 self-center"></div>

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                disabled={!editor.can().chain().focus().toggleBulletList().run()}
                className={btnClass(editor.isActive('bulletList'))}
                title="Lista Desordenada"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                disabled={!editor.can().chain().focus().toggleOrderedList().run()}
                className={btnClass(editor.isActive('orderedList'))}
                title="Lista Ordenada"
            >
                <ListOrdered className="w-4 h-4" />
            </button>
        </div>
    );
};

export const EmailEditor: React.FC<EmailEditorProps> = ({ content, onChange, disabled = false }) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false, // We use custom heading extension
            }),
            Heading.configure({
                levels: [1, 2, 3],
            }),
        ],
        content,
        editorProps: {
            attributes: {
                class: 'p-4 outline-none min-h-[250px] max-h-[500px] overflow-y-auto prose prose-invert prose-sm sm:prose-base max-w-none custom-scrollbar ' + (disabled ? 'opacity-70 cursor-not-allowed' : '')
            }
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editable: !disabled,
    });

    // Effect to update content from outside (e.g., when new AI template generated)
    React.useEffect(() => {
        if (editor && editor.getHTML() !== content && !editor.isFocused) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div className={`relative flex flex-col border border-white/10 rounded-xl bg-dark-900/40 shadow-inner ${disabled ? 'opacity-80' : ''}`}>
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
};
