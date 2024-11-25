import { internalMutation, MutationCtx, QueryCtx,query } from "../_generated/server";
import { v } from "convex/values";
//user functions for interacting with the db, triggered by webhook handler
export const get = query({//retrieve current user
  handler: async (ctx) => {
    return await getCurrentUser(ctx);//check authentication and query
  },
});
export const upsert = internalMutation({//add or update user
  args: {
    username: v.string(),
    image: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db //grab user by clerkId can be called here
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (user) {
      await ctx.db.patch(user._id, {
        username: args.username,
        image: args.image,
      });
    } else {
      await ctx.db.insert("users", {
        username: args.username,
        image: args.image,
        clerkId: args.clerkId,
      });
    }
  },
});

export const remove = internalMutation({//removes user
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await getUserByClerkId(ctx, clerkId);//grabs user by clerkId
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});


//helper functions
//bridge between authentication system and db
export const getCurrentUser = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();//get user's identity from the authentication provider
  if (!identity) {
    return null;
  }
  return await getUserByClerkId(ctx, identity.subject);
};
//fetches the user from the database using their clerkId
const getUserByClerkId = async (//purely database interaction without checking authentication
  ctx: QueryCtx | MutationCtx,
  clerkId: string
) => {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
};
