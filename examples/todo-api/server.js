import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let todos = [
  { id: 1, title: 'First task', completed: false },
  { id: 2, title: 'Second task', completed: true }
];
let nextId = 3;

app.get('/todos', (req, res) => {
  res.json(todos);
});

app.post('/todos', (req, res) => {
  const { title } = req.body;
  const todo = { id: nextId++, title, completed: false };
  todos.push(todo);
  res.status(201).json(todo);
});

app.patch('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, completed, dueDate } = req.body;
  const todo = todos.find(t => t.id === id);
  if (!todo) return res.status(404).json({ error: 'Not found' });
  if (title !== undefined) todo.title = title;
  if (completed !== undefined) todo.completed = completed;
  if (dueDate !== undefined) todo.dueDate = dueDate;
  res.json(todo);
});

app.delete('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  todos = todos.filter(t => t.id !== id);
  res.status(204).end();
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Todo API listening on http://localhost:${port}`);
});


