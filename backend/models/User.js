const mongoose = require("mongoose");
const bcrypt= require("bcryptjs");

const UserSchema= new mongoose.Schema(
    {
        name:{type:String,required:[true, "Name is required"],trim:true},
        email:{type:String,required:true,unique:true,lowercase:true,trim:true,match:[/^\S+@\S+\.\S+$/, "Invalid email format"]},
        password:{type:String,required:true,minlength:6,select:false},
        role:{type:String,enum:["admin","user","hr","sales"],default:"user"},
        isActive:{type:Boolean,default:true},
    },{timestamps:true}
);

module.exports=mongoose.model("User",UserSchema)
