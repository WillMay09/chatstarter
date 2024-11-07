import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { internal } from "./_generated/api";
const http = httpRouter();

http.route({//current routes
  method: "POST",
  path: "/clerk-webhook",
  handler: httpAction(async (ctx, req) => {
    const body = await validateRequest(req);//call upon validate request
    if (!body) {//if nothing returns
      return new Response("Unauthorized", { status: 401 });
    }
    switch (body.type) {//information from clerk authentication
      case "user.created"://calling a mutation function on the backend
        await ctx.runMutation(internal.functions.user.upsert, {
          username: body.data.username!,
          image: body.data.image_url,
          clerkId: body.data.id,
        });
        break;
      case "user.updated":
        await ctx.runMutation(internal.functions.user.upsert, {
          username: body.data.username!,
          image: body.data.image_url,
          clerkId: body.data.id,
        });
        break;
      case "user.deleted":
        if (body.data.id) {
          await ctx.runMutation(internal.functions.user.remove, {
            clerkId: body.data.id,
          });
        }
        break;
    }

    return new Response("OK", { status: 200 });
  }),
});

//ensures incoming request is from a verified source(svix)
const validateRequest = async (req: Request) => {
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");
  const text = await req.text();
  try {
    const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    return webhook.verify(text, {
      "svix-id": svix_id!,
      "svix-timestamp": svix_timestamp!,
      "svix-signature": svix_signature!,
    }) as unknown as WebhookEvent;
  } catch (error) {
    return null;
  }
};
export default http;
