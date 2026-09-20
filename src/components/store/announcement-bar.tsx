"use client";

import { useEffect, useState } from "react";

/**
 * Un mensaje por vez, que rota (§5). Los lectores de pantalla leen la lista
 * completa una sola vez, así que la rotación no los interrumpe.
 */
export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % messages.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="bg-rosa text-chocolate">
      <div className="mx-auto flex h-10 max-w-6xl items-center justify-center px-4 text-center text-sm">
        <span key={index} className="fade-in truncate" aria-hidden="true">
          {messages[index % messages.length]}
        </span>
        <ul className="sr-only">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
