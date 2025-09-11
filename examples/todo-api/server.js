import express from 'express';
import cors from 'cors';
import { normalizeDueDate } from './src/models/task.js';
import { isOverdue, sortByDueDateAscNullsLast } from './src/utils/todoHelpers.js';

export const app = express();
app.use(cors());
app.use(express.json());

let todos = [
  { id: 1, title: 'First task', completed: false },
  { id: 2, title: 'Second task', completed: true },
];
let nextId = 3;

app.get('/todos', (req, res) => {
  const nowMs = Date.now();
  // Compute overdue flag and sort by dueDate (ascending), nulls last
  const enriched = todos.map((t) => ({ ...t, overdue: isOverdue(t, nowMs) }));
  const sorted = sortByDueDateAscNullsLast(enriched);
  res.json(sorted);
});

app.post('/todos', (req, res) => {
  const { title, dueDate } = req.body || {};
  // Optional dueDate: validate/normalize when present using model helper
  try {
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
    }
    const normalized = normalizeDueDate(dueDate);
    const todo = {
      id: nextId++,
      title,
      completed: false,
      dueDate: normalized ? normalized.toISOString() : null,
    };
    todos.push(todo);
    res.status(201).json(todo);
  } catch (err) {
    res.status(400).json({ error: 'Invalid dueDate', details: String(err && err.message || err) });
  }
});

app.patch('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, completed, dueDate } = req.body;
  const todo = todos.find(t => t.id === id);
  if (!todo) return res.status(404).json({ error: 'Not found' });
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title must be a non-empty string' });
    }
    todo.title = title;
  }
  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'Completed must be a boolean' });
    }
    todo.completed = completed;
  }
  if (dueDate !== undefined) {
    try {
      const normalized = normalizeDueDate(dueDate);
      todo.dueDate = normalized ? normalized.toISOString() : null;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid dueDate', details: String((err && err.message) || err) });
    }
  }
  res.json(todo);
});

app.delete('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  todos = todos.filter(t => t.id !== id);
  res.status(204).end();
});

if (process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Todo API listening on http://localhost:${port}`);
  });
}
