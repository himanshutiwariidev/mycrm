const mongoose = require("mongoose");
const bcrypt= require("bcryptjs");

const UserSchema= new mongoose.Schema(
    {
        name:{type:String,required:[true, "Name is required"],trim:true},
        email:{type:String,required:true,unique:true,lowercase:true,trim:true,match:[/^\S+@\S+\.\S+$/, "Invalid email format"]},
        password:{type:String,required:true,minlength:6,select:false},
        role:{type:String,enum:["admin","user","hr","sales","client","manager","telecaller","salesmanager"],default:"user"},
        clientId:{type:mongoose.Schema.Types.ObjectId,ref:"Client"},
        isActive:{type:Boolean,default:true},
        photo:{type:String,trim:true},
        empCode:{type:String,trim:true},
        phone:{type:String,trim:true},
        bloodGroup:{type:String,trim:true,uppercase:true},
        emergencyContact:{type:String,trim:true},
        address:{type:String,trim:true},
        pan:{type:String,trim:true,uppercase:true},
        aadhar:{type:String,trim:true},
        bankAccount:{type:String,trim:true},
        doj:{type:Date},
        salary:{type:Number,min:0},
        designation:{type:String,trim:true},
        department:{type:String,trim:true},
        remarks:{type:String,trim:true},
        aadharDoc:{
            filename:{type:String,trim:true},
            originalName:{type:String,trim:true},
            uploadedAt:{type:Date},
        },
        panDoc:{
            filename:{type:String,trim:true},
            originalName:{type:String,trim:true},
            uploadedAt:{type:Date},
        },
        otherDocs:[{
            filename:{type:String,trim:true,required:true},
            originalName:{type:String,trim:true},
            uploadedAt:{type:Date,default:Date.now},
        }],
        // Admin credential-recovery flow (OTP sent to a hardcoded recovery
        // email — see controllers/adminRecoveryController.js). Only ever
        // populated on the single "admin" role user; select:false keeps
        // these hashes out of normal queries the same way password is.
        otpCodeHash:{type:String,select:false},
        otpExpiresAt:{type:Date,select:false},
        otpAttempts:{type:Number,default:0,select:false},
        otpSessionId:{type:String,select:false},
    },{timestamps:true}
);

module.exports=mongoose.model("User",UserSchema)
