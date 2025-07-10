import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
<h1 className="text-4xl font-bold text-purple-600 underline">
  Tailwind is working!
</h1>

export default function NoteEditor({ noteId = "demo-note" }) {
  const [content, setContent] = useState("");

  useEffect(() => {
    const socket = io("http://localhost:3001");

    socket.on("connect", () => {
      console.log("✅ Connected with ID:", socket.id);
    });

    socket.emit("join-note", noteId);

    socket.on("note-updated", (newContent) => {
      setContent(newContent);
    });

    const handleSendEdit = (e) => {
      const { noteId, content } = e.detail;
      socket.emit("edit-note", { noteId, content });
    };
    window.addEventListener("send-edit", handleSendEdit);

    return () => {
      socket.disconnect();
      window.removeEventListener("send-edit", handleSendEdit);
    };
  }, [noteId]);

  const handleChange = (e) => {
    const newText = e.target.value;
    setContent(newText);
    window.dispatchEvent(new CustomEvent("send-edit", {
      detail: { noteId, content: newText }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center p-8">
      <div className="w-full max-w-4xl bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Collaborative Note Editor</h1>
        <textarea
          value={content}
          onChange={handleChange}
          className="w-full h-[80vh] resize-none outline-none p-6 text-lg leading-relaxed border border-gray-300 rounded-md shadow-sm"
          placeholder="Start typing your document..."
        />
      </div>
    </div>
  );
}




