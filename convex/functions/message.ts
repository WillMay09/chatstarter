import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

//query the database, rn it fetches all messages
//ctx is how the function interacts with db data
export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});
//modify data in the database
export const create = mutation({
  //defines arguments mutation expects
  args: {
    sender: v.string(),
    content: v.string(),
  },
  handler: async (ctx, { sender, content }) => {
    await ctx.db.insert("messages", { sender, content });
  },
});
