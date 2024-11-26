import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./helpers";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

//list all users currently typing in the direct message channel
export const list = authenticatedQuery({
  args: {
    directMessage: v.id("directMessages"),
  },
  handler: async (ctx, { directMessage }) => {
    const typingIndicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_direct_message", (q) =>
        q.eq("directMessage", directMessage)
      )//fetch all the typing indicators in this direct message channel
      .filter((q) => q.neq(q.field("user"), ctx.user._id))//filter out typing indicators of current user
      .collect();
      //grab user names from typing indicators
      return await Promise.all(
        typingIndicators.map(async (indicator) =>{
            const user = await ctx.db.get(indicator.user);
            if(!user){//if there are no users
                throw new Error("user does not exist.");
            }
            return user.username;

        })
      )
  },
});
//create a typing indicator or update current one with an expiration date
export const upsert = authenticatedMutation({
  args: {
    directMessage: v.id("directMessages"),
  },
  handler: async (ctx, { directMessage }) => {
    //query typing indicators table
    const existing = await ctx.db
      .query("typingIndicators")
      //if typing indicator exits, return it
      .withIndex("by_user_direct_message", (q) =>
        q.eq("user", ctx.user._id).eq("directMessage", directMessage)
      )
      .unique();
    //update the typing indicator
    const expiresAt = Date.now() + 5000;
    if (existing) {
      //update typing indicator
      await ctx.db.patch(existing._id, { expiresAt });
    } else {
      //create typing indicator
      await ctx.db.insert("typingIndicators", {
        user: ctx.user._id,
        directMessage,
        expiresAt,
      });
    }
    //schedule the internal mutation to run at the expiration time
    await ctx.scheduler.runAt(expiresAt, internal.functions.typing.remove, {
      directMessage,
      user: ctx.user._id,
      expiresAt,
    });
  },
});
export const remove = internalMutation({
  args: {
    directMessage: v.id("directMessages"),
    user: v.id("users"),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, { directMessage, user, expiresAt }) => {
    //find indicator
    const existing = await ctx.db
      .query("typingIndicators") //find message with directMessage id and userid
      .withIndex("by_user_direct_message", (q) =>
        q.eq("user", user).eq("directMessage", directMessage)
      )
      .unique();

    //delete indicator if we want to
    if (existing && (!expiresAt || existing.expiresAt === expiresAt)) {
      await ctx.db.delete(existing._id);
    }
  },
});
