import {customCtx, customMutation, customQuery} from "convex-helpers/server/customFunctions"
import { getCurrentUser } from "./user"
import {mutation, query} from "../_generated/server"
//for logged in users
//helper functions to check to ensure a user is logged in
export const authenticatedQuery = customQuery(query,customCtx(async(ctx) =>{
    const user = await getCurrentUser(ctx)
    if(!user){

        throw new Error("Unauthorized")
    }
    return {user};
}))
//both functions use getCurrentUser, to grab the user from the db,perform an authentication check
export const authenticatedMutation = customMutation(mutation,customCtx(async (ctx) =>{

    const user = await getCurrentUser(ctx);
    if(!user){

        throw new Error("Unauthorized")
    }
    return {user};
})


)