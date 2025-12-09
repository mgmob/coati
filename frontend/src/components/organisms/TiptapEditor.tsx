import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';
import { Button } from '../atoms/Button';
import { cn } from '../../lib/utils';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  readOnly?: boolean;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content, onChange, className, readOnly = false
}) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[300px]',
      },
    },
  });

  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={cn("flex flex-col border border-gray-200 rounded-lg overflow-hidden bg-white", className)}>
      {!readOnly && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-gray-200 text-black' : ''}
            icon={Bold}
            title="Bold"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-gray-200 text-black' : ''}
            icon={Italic}
            title="Italic"
          />
          <div className="w-[1px] h-4 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-gray-200 text-black' : ''}
            icon={List}
            title="Bullet List"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-gray-200 text-black' : ''}
            icon={ListOrdered}
            title="Ordered List"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'bg-gray-200 text-black' : ''}
            icon={Quote}
            title="Quote"
          />
          <div className="w-[1px] h-4 bg-gray-300 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            icon={Undo}
            title="Undo"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            icon={Redo}
            title="Redo"
          />
        </div>
      )}

      <div className="flex-1 p-4 overflow-y-auto cursor-text" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};