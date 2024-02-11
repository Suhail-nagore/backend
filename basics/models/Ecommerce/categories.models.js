import mongoose from "mongoose"


const categoriesSchema = new mongoose.schema({
    name:{
        type:String,
        required: true,
    }
}, {timestamps:true})


export const Category = mongoose.model("Category", categoriesSchema)