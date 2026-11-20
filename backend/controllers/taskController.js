const Task = require("../models/Task")
const User = require("../models/User")
const { syncTaskProgressToContract } = require("../utils/deliverableSync")
const { logActivity } = require("../utils/activityLogger")

exports.createTask = async(req,res)=>{
    try{
        const {title,description,assignedTo,dueDate,priority}=req.body;
        const task = await Task.create({
            title,
            description,
            assignedTo,
            dueDate,
            priority,
            createdBy:req.user.id
        });
        res.status(201).json({message:"task created",task})
    }catch(error){
        res.status(500).json({error:error.message})
    }
};


exports.getTask = async (req,res)=>{
    try{
        const task = await Task.find()
        .populate("assignedTo","name email")
        .populate("createdBy", "name email")
        .populate("clientId", "clientName companyName")
        .populate("contractId", "projectName contractNumber")
        .sort({ createdAt: -1 });
        res.json(task);
    }catch(error){
        res.status(500).json({error:error.message})
    }
}

exports.getMyTasks = async(req,res)=>{
    try{
       const task = await Task.find({assignedTo:req.user.id})
       .populate("clientId", "clientName companyName")
       .populate("contractId", "projectName contractNumber");
       res.json(task);
    }catch(error){
        res.status(500).json({error:error.message})
    }
}

exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Admin/manager can update any task
    // Assigned user can update status (an unassigned task has no one else who can)
    if (
      req.user.role !== "admin" && req.user.role !== "manager" &&
      (!task.assignedTo || task.assignedTo.toString() !== req.user.id)
    ) {
      return res.status(403).json({ message: "Not allowed to update status" });
    }

    task.status = status;
    await task.save();

    res.json({ message: "Task status updated successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.updateTask = async (req, res) => {
    
  try {
    const { title, description, assignedTo, dueDate, priority, status } = req.body;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Only Admin/Manager OR Creator can update task
    if (
      task.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin" && req.user.role !== "manager"
    ) {
      return res.status(403).json({ message: "Not allowed to update task" });
    }

    task.title = title || task.title;
    task.description = description || task.description;
    // assignedTo is intentionally distinguished from "not provided": an empty
    // string from the "Unassigned" option must actually clear it, not be
    // silently ignored like a falsy-OR would do.
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    task.dueDate = dueDate || task.dueDate;
    task.priority = priority || task.priority;
    task.status = status || task.status;

    await task.save();

    res.json({
      message: "Task updated successfully",
      task,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDeliverableProgress = async (req, res) => {
  try {
    const { delivered } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Same authorization as updateTaskStatus: admin/manager can always
    // update, the assignee can update their own task's progress.
    if (
      req.user.role !== "admin" && req.user.role !== "manager" &&
      (!task.assignedTo || task.assignedTo.toString() !== req.user.id)
    ) {
      return res.status(403).json({ message: "Not allowed to update this task's deliverables" });
    }

    const deliverable = task.deliverables.id(req.params.deliverableId);
    if (!deliverable) {
      return res.status(404).json({ message: "Deliverable not found" });
    }

    const requested = Number(delivered) || 0;
    const cap = deliverable.quantity ?? requested;
    const clamped = Math.max(0, Math.min(requested, cap));
    const previousDelivered = deliverable.delivered || 0;
    deliverable.delivered = clamped;

    // Push the change onto the originating contract deliverable too — the
    // Sales and Admin panels read Contract.deliverables, not this task copy,
    // so without this the user's/manager's progress never reached them.
    // Runs before task.save() so a legacy task's matched contractDeliverableId
    // is persisted in the same save. Best-effort: the task update stands even
    // if the contract sync fails, but it's reported back as contractSynced.
    let synced = null;
    try {
      synced = await syncTaskProgressToContract(task, deliverable, previousDelivered);
    } catch (syncError) {
      console.error("Failed to sync deliverable progress to contract:", syncError);
    }

    await task.save();

    if (synced && clamped !== previousDelivered) {
      const actor = await User.findById(req.user.id).select("name").lean().catch(() => null);
      await logActivity(
        task.clientId || synced.contract.clientId,
        "deliverable_updated",
        `${actor?.name || "A team member"} updated "${deliverable.title}" to ${clamped}/${deliverable.quantity ?? clamped} on "${synced.contract.projectName}"`,
        { contractId: synced.contract._id, taskId: task._id }
      );
    }

    res.json({ message: "Deliverable progress updated", task, contractSynced: !!synced });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTask = async(req,res)=>{
    try{
        const task = await Task.findByIdAndDelete(req.params.id)
        res.status(200).json({message:"task deleted successfully"})
    }catch(error){
        res.status(500).json({error:error.message});
    }
};