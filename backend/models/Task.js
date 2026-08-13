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
// Compact per-item summary for a deliverable-generated task (one task now
// covers a whole service category, e.g. Social Media, not a single
// deliverable) — lets the task card show "what and how much" without
// duplicating the full Deliverables tab. Absent on manually-created tasks.
deliverables:[{
  title:{type:String,trim:true},
  quantity:{type:Number},
  frequency:{type:String},
  // How much of this deliverable's quantity has been completed so far —
  // updated by the assignee (or admin) as work progresses, independent of
  // the overall task status. Absent/0 on freshly-created tasks.
  delivered:{type:Number,default:0},
  // Mirrors Contract.deliverables' unit/metadata (see backend/models/Contract.js)
  // so a service-aware task card (e.g. "12 Pages", "₹50,000/month • 3 Campaigns")
  // doesn't need to look the originating contract up. Absent on legacy tasks
  // and generic/quantity-only deliverables, which fall back to quantity/frequency.
  unit:{type:String},
  metadata:{type:mongoose.Schema.Types.Mixed},
  // The service category this item's icon/unit model was resolved from
  // (see frontend/src/config/serviceVisuals.js) — lets the UI fall back to
  // a category-accurate icon when the title itself doesn't name a specific
  // brand/platform. Absent on legacy tasks.
  categoryId:{type:String},
}],
},{timestamps:true});

taskSchema.index({assignedTo:1, status:1})

module.exports= mongoose.model("Task",taskSchema)