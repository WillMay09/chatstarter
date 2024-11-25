import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./helpers";

//query the database, fetch all messages from a specific direct message channel
//ctx is how the function interacts with db data

export const list = authenticatedQuery({
  args: {
    directMessage: v.id("directMessages"),
  },
  handler: async (ctx, { directMessage }) => {
    //checks if the user is a member
    const member = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_direct_message_user", (q) =>
        q.eq("directMessage", directMessage).eq("user", ctx.user._id)
      )
      .first();
      
    if (!member) {
      throw new Error("You are not a member of this direct Message");
    }
    //fetches all messages in the direct message channel
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_direct_message", (q) =>
        q.eq("directMessage", directMessage)
      )
      .collect();
      //resolve sender details for each message
    return await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.sender);
        return {
          ...message,//include original message data
          sender,//Add sender details
        };
      })
    );
  },
});
//modify data in the database
export const create = authenticatedMutation({
  //defines arguments mutation expects
  args: {
    content: v.string(),
    directMessage: v.id("directMessages"),
  },
  //checks if the user is a member of the direct message table
  handler: async (ctx, { content, directMessage }) => {
    const member = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_direct_message_user", (q) =>
        q.eq("directMessage", directMessage).eq("user", ctx.user._id)
      )
      .first();
      //throws an error if the user is not a member
    if (!member) {
      throw new Error("You are not a member of this direct Message");
    }
    //insert a new message into the database
    await ctx.db.insert("messages", {
      content,//message
      directMessage,//ID of direct message channel
      sender: ctx.user._id, //Id of the user sending the message
    });
  },
});

export const remove = authenticatedMutation({
  args:{
    id:v.id("messages"),


  },
  handler: async(ctx, {id}) =>{
    const message = await ctx.db.get(id);
    if(!message){
      throw new Error("Message does not exist.");


    }else if (message.sender !== ctx.user._id){
      throw new Error("You are not the sender of this message");
    }
    await ctx.db.delete(id);


  }
})
