import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

export default function NoteEditor({ noteId = "demo-note" }) {
  const [content, setContent] = useState("");
  const [cursors, setCursors] = useState({});
  const socketRef = useRef(null);
  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);

  // Setup socket connection and listeners
  useEffect(() => {
    socketRef.current = io("http://localhost:3001", {
      transports: ["websocket"],
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-note", noteId);
    });

    socketRef.current.on("note-updated", (newContent) => {
      setContent(newContent);
    });

    socketRef.current.on("cursor-update", ({ socketId, cursor }) => {
      if (socketId !== socketRef.current.id) {
        setCursors((prev) => ({ ...prev, [socketId]: cursor }));
      }
    });

    socketRef.current.on("user-disconnected", (socketId) => {
      setCursors((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [noteId]);

  const handleChange = (e) => {
    const value = e.target.value;
    setContent(value);
    socketRef.current.emit("send-changes", value);
    handleCursorMove();
  };

  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const position = textareaRef.current.selectionStart;
    socketRef.current.emit("cursor-move", { noteId, cursor: position });
  };

  // Core logic to get accurate position of cursor
  const getCursorCoords = (cursorPos) => {
    const mirror = mirrorRef.current;
    const textarea = textareaRef.current;
    if (!mirror || !textarea) return { top: 0, left: 0 };

    // Apply same content before cursor and a span at cursor
    const before = content.slice(0, cursorPos);
    const after = content.slice(cursorPos);
    mirror.innerHTML = "";

    const beforeText = document.createTextNode(before);
    const span = document.createElement("span");
    span.textContent = "|"; // Dummy cursor
    const afterText = document.createTextNode(after);

    mirror.appendChild(beforeText);
    mirror.appendChild(span);
    mirror.appendChild(afterText);

    const spanRect = span.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();

    mirror.innerHTML = "";

    return {
      top: spanRect.top - textareaRect.top + textarea.scrollTop,
      left: spanRect.left - textareaRect.left + textarea.scrollLeft,
    };
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen relative">
      <h1 className="text-4xl font-bold text-purple-600 underline mb-4">
        Collaborative Notes
      </h1>

      <textarea
        ref={textareaRef}
        className="w-full h-[80vh] p-4 border border-gray-300 rounded-lg shadow bg-white resize-none font-mono text-base leading-relaxed"
        placeholder="Start typing your document..."
        value={content}
        onChange={handleChange}
        onKeyUp={handleCursorMove}
        onClick={handleCursorMove}
        onSelect={handleCursorMove}
        onMouseUp={handleCursorMove}
      />

      {/* Remote Cursor Markers */}
      {Object.entries(cursors).map(([id, pos]) => {
        const coords = getCursorCoords(pos);
        return (
          <div
            key={id}
            className="absolute text-xs text-blue-600 bg-white px-1 border border-blue-300 rounded pointer-events-none"
            style={{
              top: `${coords.top + textareaRef.current.offsetTop}px`,
              left: `${coords.left + textareaRef.current.offsetLeft}px`,
              zIndex: 10,
            }}
          >
            👆 User {id.slice(-4)}
          </div>
        );
      })}

      {/* Mirror div for measuring cursor */}
      <div
        ref={mirrorRef}
        className="invisible whitespace-pre-wrap break-words font-mono text-base leading-relaxed p-4"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: textareaRef.current?.offsetWidth || "100%",
          visibility: "hidden",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
