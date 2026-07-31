const mongoose = require("mongoose")

const taskSchema= new mongoose.Schema({
title:{type:String,required:true,trim:true},
description:{type:String,trim:true},
// Optional: tasks auto-created from a contract's deliverables start out
// unassigned so an admin can assign them from the "All Tasks" section.
assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
createdBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
status:{type:String,enum:["pending","in-progress","completed"],default:"pending"},
priority:{type:String,enum: ["low", "medium", "high"],default:"medium"},
dueDate:{type:Date},
// Traceability back to the contract/client a deliverable-generated task
// came from. Absent on manually-created tasks.
contractId:{type:mongoose.Schema.Types.ObjectId,ref:"Contract"},
clientId:{type:mongoose.Schema.Types.ObjectId,ref:"Client"},
},{timestamps:true});

taskSchema.index({assignedTo:1, status:1})

module.exports= mongoose.model("Task",taskSchema)