"use client";
import {Authenticated,Unauthenticated,useMutation, useQuery} from "convex/react";
import React, { useState } from "react";
import {api} from "../../convex/_generated/api"
import { SignInButton } from "@clerk/nextjs";
// interface Message {
//   sender: string;
//   content: string;
// }

export default function Home() {
  // const [messages, setMessages] = useState<Message[]>([
  //   { sender: "alice", content: "Hello world" },
  //   { sender: "Bob", content: "Hi, Alice!" },
  // ]);
  //fetches messages from db using api
  const messages = useQuery(api.functions.message.list);
  //allows for the creation of a message in db
  const createMessage = useMutation(api.functions.message.create);

  const [input, setInput] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    createMessage({sender: "Alice", content: input});
    setInput("");
  };
  return (
    <>
    <Authenticated>
    <div>
      {messages?.map((message, index) => (
        <div key={index}>
          <strong>{message.sender}</strong>: {message.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="message"
          id="message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
    </Authenticated>
    <Unauthenticated>
      <SignInButton/>


      
    </Unauthenticated>
    </>
  );
}
