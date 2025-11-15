import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

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

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(project, null, 2),
          }
        ]
      }
    })
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
