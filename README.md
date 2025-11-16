# Project Planner MCP Server

A Model Context Protocol (MCP) server for managing projects and todos, deployed on Cloudflare Workers.

## Features

- Create, list, get, and delete projects
- Create, update, list, get, and delete todos within projects
- Filter todos by status (pending, in_progress, completed)
- Data persisted in Cloudflare KV storage

## Development

```bash
npm install
npm run dev
```

## Deployment

```bash
npm run deploy
```

## MCP Endpoints

- `/sse` - Server-Sent Events endpoint for MCP clients
- `/mcp` - Standard MCP endpoint

## Available Tools

- `create_project` - Create a new project
- `list_projects` - List all projects
- `get_projects` - Get a specific project by ID
- `delete_projects` - Delete a project and all its todos
- `create_todo` - Create a new todo in a project
- `update_todo` - Update a todo's properties
- `delete_todo` - Delete a todo from a project
- `get_todo` - Get a specific todo by ID
- `list_todos` - List all todos in a project

## Roadmap

This project is not complete. Next step: integrate an AI agent to interact with this MCP server.
