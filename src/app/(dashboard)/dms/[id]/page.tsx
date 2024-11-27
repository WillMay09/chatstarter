"use client";
import React, { use, useRef, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SignOutButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  LoaderIcon,
  MoreVerticalIcon,
  PlusIcon,
  SendIcon,
  TrashIcon,
  User2Icon,
} from "lucide-react";
import Link from "next/link";
import { api } from "../../../../../convex/_generated/api";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image.js";

export default function MessagePage({
  params,
}: {
  params: Promise<{ id: Id<"directMessages"> }>;
}) {
  const { id } = use(params);
  const directMessage = useQuery(api.functions.dm.get, {
    id,
  });
  const messages = useQuery(api.functions.message.list, {
    directMessage: id,
  });
  if (!directMessage) {
    return null;
  }
  return (
    <div className="flex flex-1 flex-col divide-y max-h-screen">
      <header className="flex items-center gap-2 p-4">
        <Avatar className="size-8 border">
          <AvatarImage src={directMessage.user.image} />
        </Avatar>
        <h1 className="font-semibold">{directMessage.user.username}</h1>
      </header>
      <ScrollArea className="h-full py-4">
        {messages?.map((message) => (
          <MessageItem key={message._id} message={message} />
        ))}
      </ScrollArea>
      <TypingIndicator directMessage={id} />
      <MessageInput directMessage={id} />
    </div>
  );
}
type Message = FunctionReturnType<typeof api.functions.message.list>[number];
function MessageItem({ message }: { message: Message }) {
  const user = useQuery(api.functions.user.get);

  return (
    <div className="flex items-center px-4 gap-2 py-2">
      <Avatar className="size-8 border">
        {message.sender && <AvatarImage src={message.sender?.image} />}
        <AvatarFallback />
      </Avatar>
      <div className="flex flex-col mr-auto">
        <p className="text-xs text-muted-foreground">
          {message.sender?.username ?? "Deleted User"}
        </p>
        <p className="text-sm">{message.content}</p>
        {message.attachment && (
          <Image
            src={message.attachment}
            alt="attachment"
            width={300}
            height={300}
            className="rounded border overflowhidden"
          />
        )}
      </div>
      <MessageActions message={message} />
    </div>
  );
}

function MessageActions({ message }: { message: Message }) {
  const user = useQuery(api.functions.user.get);
  const removeMutation = useMutation(api.functions.message.remove);
  if (!user || message.sender?._id !== user._id) {
    return null;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreVerticalIcon className="size-4 text-muted-foreground" />
        <span className="sr-only">Message Actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => removeMutation({ id: message._id })}
        >
          <TrashIcon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
//display typing indicator when someone is typing
function TypingIndicator({
  directMessage,
}: {
  directMessage: Id<"directMessages">;
}) {
  //fetch usernames currently typing
  const usernames = useQuery(api.functions.typing.list, { directMessage });
  //if no usernames
  if (!usernames || usernames.length === 0) {
    return null;
  }
  return (
    //display who is typing
    <div className="text-sm text-muted-foreground px-4 py-2">
      {usernames.join(",")} is typing...
    </div>
  );
}
function MessageInput({
  directMessage,
}: {
  directMessage: Id<"directMessages">;
}) {
  const [content, setContent] = useState("");
  const sendMessage = useMutation(api.functions.message.create);
  const sendTypingIndicator = useMutation(api.functions.typing.upsert);
  const generateUploadURL = useMutation(
    api.functions.message.generatedUploadUrl
  );
  const [attachment, setAttachment] = useState<Id<"_storage">>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [isUploading, setIsUploading] = useState(false);
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setIsUploading(true);
    const url = await generateUploadURL();
    const res = await fetch(url, {
      method: "POST",
      body: file, //return a json object
    });
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    setAttachment(storageId);
    setIsUploading(false);
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await sendMessage({ directMessage, attachment, content });
      setContent("");
      setAttachment(undefined);
      setFile(undefined);
    } catch (error) {
      toast.error("Failed to send message", {
        description:
          error instanceof Error ? error.message : "An unkown error occurred",
      });
    }
  };
  return (
    <>
      <form className="flex items-end p-4 gap-2" onSubmit={handleSubmit}>
        <Button
          type="button"
          size="icon"
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          <PlusIcon />
          <span className="sr-only">Attach</span>
        </Button>
        <div className="flex flex-col flex-1 gap-2">
          {file && <ImagePreview file={file} isUploading={isUploading} />}
          <Input
            placeholder="Message"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (content.length > 0) {
                sendTypingIndicator({ directMessage });
              }
            }}
          />
        </div>

        <Button size="icon">
          <SendIcon />
          <span className="sr-only">Send</span>
        </Button>
      </form>
      <input
        type="file"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
    </>
  );
}

function ImagePreview({
  file,
  isUploading,
}: {
  file: File;
  isUploading: boolean;
}) {
  return (
    <div className="relative size-40 overflow-hidden rounded border">
      <Image
        src={URL.createObjectURL(file)}
        alt="Attachment"
        width={300}
        height={300}
      />
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50"></div>
      )}
      <LoaderIcon className="animate-spin size-8" />
    </div>
  );
}
