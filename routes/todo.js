const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');

// Get all todos
router.get('/', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new todo
router.post('/', async (req, res) => {
  const todo = new Todo({
    title: req.body.title,
    completed: req.body.completed,
    clientId: req.body.clientId
  });

  try {
    const newTodo = await todo.save();
    res.status(201).json(newTodo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a todo
router.put('/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });
    
    if (req.body.title) todo.title = req.body.title;
    if (req.body.completed !== undefined) todo.completed = req.body.completed;
    todo.updatedAt = Date.now();
    
    const updatedTodo = await todo.save();
    res.json(updatedTodo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a todo
router.delete('/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ message: 'Todo not found' });
    
    await todo.remove();
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sync multiple todos
router.post('/sync', async (req, res) => {
  try {
    const { todos } = req.body;
    
    // Process each todo item
    const results = await Promise.all(
      todos.map(async (todo) => {
        // Check if todo already exists by clientId
        const existingTodo = await Todo.findOne({ clientId: todo.clientId });
        
        if (existingTodo) {
          // Update if the local version is newer
          if (new Date(todo.updatedAt) > new Date(existingTodo.updatedAt)) {
            existingTodo.title = todo.title;
            existingTodo.completed = todo.completed;
            existingTodo.updatedAt = todo.updatedAt;
            return await existingTodo.save();
          }
          return existingTodo;
        } else {
          // Create new todo
          const newTodo = new Todo({
            title: todo.title,
            completed: todo.completed,
            clientId: todo.clientId,
            updatedAt: todo.updatedAt
          });
          return await newTodo.save();
        }
      })
    );
    
    // Get all todos after sync to send back to client
    const allTodos = await Todo.find().sort({ createdAt: -1 });
    res.status(200).json(allTodos);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;