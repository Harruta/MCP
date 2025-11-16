import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { promises } from "dns";

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Todo {
  id: string;
  projectId: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high"
  description: string;
  createdAt: string;
  updatedAt: string;
}


// Define our MCP agent with tools
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "Project Planer Agent",
    version: "1.0.0",
  });

  private get kv(): KVNamespace {
    return (this.env as Env).Porject_planner;
  }

  private async getProjectList(): Promise<string[]> {
    const listData = await this.kv.get(
      "project:list"
    );
    return listData ? JSON.parse(listData) : [];
  }

  private async getTodoList(projectId: string): Promise<string[]> {
    const listData = await this.kv.get(
      `project:${projectId}:todos`
    );
    return listData ? JSON.parse(listData) : [];
  }

  private async getTodosByProject(projectId: string): Promise<Todo[]> {
    const todoList = await this.getTodoList(projectId);
    const todos: Todo[] = [];

    for (const todoId of todoList) {
      const todoData = await this.kv.get(`todo:${todoId}`);
      if (todoData) {
        todos.push(JSON.parse(todoData));
      }
    }

    return todos;
  }



  async init() {
    this.server.tool("create_project", "create a new project", {
      name: z.string().describe("project name"),
      description: z.string().optional().describe("Project description")
    }, async ({ name, description }) => {
      const projectId = crypto.randomUUID();

      const project: Project = {
        id: projectId,
        name,
        description: description || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.kv.put(
        `project:${projectId}`,
        JSON.stringify(project)
      );

      const projectList = await this.getProjectList();
      projectList.push(projectId);
      await this.kv.put("projectList", JSON.stringify(projectList));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(project, null, 2),
          }
        ]
      }
    });

    this.server.tool("list_projects", "List all projects", {}, async () => {
      const projectList = await this.getProjectList();
      const projects: Project[] = [];

      for (const projectId of projectList) {
        const projectData = await this.kv.get(`project:${projectId}`);
        if (projectData) {
          projects.push(JSON.parse(projectData));
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(projects, null, 2),
          }
        ]
      }
    });

    this.server.tool("get_projects", "Get a specific project by ID",
      { project_id: z.string().describe("projectId") },
      async ({ project_id }) => {
        const projectData = await this.kv.get(`project:${project_id}`)

        if (!projectData) {
          throw new Error(`Project with this ID:${project_id} not found`);
        }

        const project: Project = JSON.parse(projectData);
        const todos = await this.getTodosByProject(project_id);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ project, todos }, null, 2),
            }
          ]
        }
      })


    this.server.tool("delete_projects", "Delete a project amd all tis todos",
      { project_id: z.string().describe("projectId") },
      async ({ project_id }) => {
        const projectData = await this.kv.get(`project:${project_id}`)

        if (!projectData) {
          throw new Error(`Project with this ID:${project_id} not found`);
        }

        const todos = await this.getTodosByProject(project_id);

        for (const todo of todos) {
          await this.kv.delete(`todo:${todo.id}`)
        }

        await this.kv.delete(`project:${project_id}:todos`);
        await this.kv.delete(`project:${project_id}`);

        const projectList = await this.getProjectList();
        const updateList = projectList.filter((id) => id !== project_id);
        await this.kv.put("project:list", JSON.stringify(updateList));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ project, todos }, null, 2),
            }
          ]
        }
      })






    this.server.tool("create_todo", "Create a new todo in a project", {
      project_id: z.string().describe("Project ID"),
      title: z.string().describe("Todo title"),
      description: z.string().optional().describe("Todo description"),
      priority: z.enum(["low", "medium", "high"]).optional().describe("Todo priority"),
    }, async ({ project_id, title, description, priority }) => {
      const projectData = await this.kv.get(`project${project_id}`);

      if (!projectData) {
        throw new Error(`Project with this id:${project_id} not found`);
      }

      const todoId = crypto.randomUUID();
      const todo: Todo = {
        id: todoId,
        projectId: project_id,
        title,
        description: description || "",
        status: "pending",
        priority: priority || "medium",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.kv.put(`todo${todoId}`, JSON.stringify(todo));

      const todoList = await this.getTodoList(project_id);
      todoList.push(todoId),
        await this.kv.put(
          `project:${project_id}:todos`,
          JSON.stringify(todoList)
        );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(todo, null, 2),
          }
        ]
      }
    });
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
