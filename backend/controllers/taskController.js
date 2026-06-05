const Task = require("../models/Task")

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
        .populate("createdBy", "name email");
        res.json(task);
    }catch(error){
        res.status(500).json({error:error.message})
    }
}

exports.getMyTasks = async(req,res)=>{
    try{
       const task = await Task.find({assignedTo:req.user.id});
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

    // Admin can update any task
    // Assigned user can update status
    if (
      task.assignedTo.toString() !== req.user.id &&
      req.user.role !== "admin"
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

    // Only Admin OR Creator can update task
    if (
      task.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not allowed to update task" });
    }

    task.title = title || task.title;
    task.description = description || task.description;
    task.assignedTo = assignedTo || task.assignedTo;
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

exports.deleteTask = async(req,res)=>{
    try{
        const task = await Task.findByIdAndDelete(req.params.id)
        res.status(200).json({message:"task deleted successfully"})
    }catch(error){
        res.status(500).json({error:error.message});
    }
};