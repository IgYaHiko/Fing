import { inngest } from "./client";
import { openai, createAgent, gemini, createTool, createNetwork, type Message, createState } from "@inngest/agent-kit";
import { getSandbox, lastAssisTextMsgCon } from "./utils";
import { Sandbox } from "@e2b/code-interpreter";
import { FRAGMENT_TITLE_PROMPT, PROMPT, RESPONSE_PROMPT } from "@/prompt";
import { z } from "zod";
import prisma from "@/lib/db";
import { SANDBOX_SET_TIMEOUT } from "./types";

interface AgentState {
  summary: string;
  files: {[path:string]:string};
}

const parseOut = (value: Message[]) => {
  const output = value[0];
  if(output.type !== 'text') {
    return "Here You go";
  }

  if(Array.isArray(output.content)) {
    return output.content.map((txt) => txt).join("");
  } else {
    return output.content;
  }
};

// Updated Model configuration with working models
const SUPPORTED_MODELS = {
  'gpt-4.1': {
    provider: openai,
    config: { model: 'gpt-4.1', defaultParameters: { temperature: 0.1 } }
  },
  'gpt-4o': {
    provider: openai,
    config: { model: 'gpt-4o', defaultParameters: { temperature: 0.1 } }
  },
  'gemini-1.5-flash': {
    provider: gemini,
    config: { model: 'gemini-1.5-flash' }
  },
  'gemini-1.5-pro': {
    provider: gemini,
    config: { model: 'gemini-1.5-pro' }
  }
};

const normalizeModel = (model: string): keyof typeof SUPPORTED_MODELS => {
  const lower = model.toLowerCase().trim();
  if (lower.includes('gpt-4o')) return 'gpt-4o';
  if (lower.includes('gpt-4.1')) return 'gpt-4.1';
  if (lower.includes('gemini-1.5-flash')) return 'gemini-1.5-flash';
  if (lower.includes('gemini-1.5-pro')) return 'gemini-1.5-pro';
  if (lower.includes('gemini-2.0-flash-lite')) return 'gemini-1.5-flash'; // Fallback
  return 'gpt-4.1'; // default fallback
};

export const fing_AI_Agent = inngest.createFunction(
  { id: "code-agent" },
  { event: "app/message.created" },
  async ({ event, step }) => {
    const { selectedModel: rawModel = "gpt-4.1" } = event.data;
    const selectedModel = normalizeModel(rawModel);
    const modelConfig = SUPPORTED_MODELS[selectedModel];

    console.log(`🚀 Starting agent with model: ${selectedModel}`);

    const sandboxId = await step.run("get_sandbox-id", async () => {
      try {
        console.log("🔄 Creating E2B sandbox...");
        const sandbox = await Sandbox.create("fing-next-jsv1");
        console.log("✅ Sandbox created:", sandbox.sandboxId);
        
        // Wait for sandbox to be ready
        console.log("⏳ Waiting for sandbox to be ready...");
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        await sandbox.setTimeout(SANDBOX_SET_TIMEOUT);
        return sandbox.sandboxId;
      } catch (error) {
        console.error("❌ Failed to create sandbox:", error);
        throw new Error(`Sandbox creation failed: ${error}`);
      }
    });

    const previousMessage = await step.run("previous_message", async () => {
      const formattedMsg: Message[] = [];
      const messages = await prisma.message.findMany({
        where: { projectId: event.data.projectId },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      for (const msg of messages) {
        formattedMsg.push({
          type: "text",
          role: msg.role === 'ASSISTANT' ? "assistant" : 'user',
          content: msg.content
        });
      }
      return formattedMsg.reverse();
    });

    const state = createState<AgentState>(
      { summary: "", files: {} },
      { messages: previousMessage }
    );

    // Create main agent with selected model
    const codeAgent = createAgent<AgentState>({
      name: "Fing-AI",
      description: "I'm FING AI, an expert coding agent. I can develop Next.js projects with interactive UI",
      system: PROMPT,
      model: modelConfig.provider(modelConfig.config),
      tools: [
        createTool({
          name: "terminal",
          description: "Run commands in the terminal",
          parameters: z.object({ command: z.string() }),
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffer = { stdout: "", stderr: "" };
              try {
                const sandbox = await getSandbox(sandboxId);
                console.log(`🔧 Running command: ${command}`);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => { 
                    buffer.stdout += data;
                    console.log(`📝 STDOUT: ${data}`);
                  },
                  onStderr: (data: string) => { 
                    buffer.stderr += data;
                    console.log(`⚠️ STDERR: ${data}`);
                  }
                });
                console.log(`✅ Command completed: ${command}`);
                return result.stdout || "Command executed successfully";
              } catch (error) {
                console.error(`❌ Command Failed: ${error} \n stdout: ${buffer.stdout} \n stderr: ${buffer.stderr}`);
                return `Command Failed: ${error} \n stdout: ${buffer.stdout} \n stderr: ${buffer.stderr}`;
              }
            });
          }
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create and update files in the sandbox",
          parameters: z.object({
            files: z.array(z.object({
              path: z.string().describe("File path"),
              content: z.string().describe("File content"),
            })),
          }),
          handler: async ({ files }, { step, network }) => {
            const newFiles = await step?.run("createOrUpdateFiles", async () => {
              try {
                const updatedFiles = network.state.data.files || {};
                const sandbox = await getSandbox(sandboxId);
                console.log(`📁 Writing ${files.length} files to sandbox...`);
                
                for (const file of files) {
                  console.log(`📄 Writing file: ${file.path}`);
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }
                
                console.log("✅ Files written successfully");
                return updatedFiles;
              } catch (error) {
                console.error("❌ Error writing files:", error);
                return "Error: " + error;
              }
            });
            if (typeof newFiles === "object") {
              network.state.data.files = newFiles;
            }
          }
        }),
        createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({ files: z.array(z.string()) }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents);
              } catch (error) {
                return "Error: " + error;
              }
            });
          }
        })
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastMsgConAsis = lastAssisTextMsgCon(result);
          if (lastMsgConAsis && network && lastMsgConAsis.includes("<task_summary>")) {
            network.state.data.summary = lastMsgConAsis;
          }
          return result;
        }
      }
    });

    const network = createNetwork<AgentState>({
      name: "Fing-AI-networks",
      agents: [codeAgent],
      maxIter: 5,
      defaultState: state,
      router: async ({ network }) => {
        return network.state.data.summary ? undefined : codeAgent;
      }
    });

    console.log("🤖 Starting agent execution...");
    const result = await network.run(event.data.prompt, {state});
    console.log("✅ Agent execution completed");

    // Fragment title generator - use GPT-4 for reliability
    const fragementTitleGenerator = createAgent({
      name: 'FingAI_Fragment',
      description: "Generate the title of the fragment",
      system: FRAGMENT_TITLE_PROMPT,
      model: openai({model: "gpt-4", defaultParameters: { temperature: 0.1 }})
    });

    // Response generator uses the same model as main agent
    const responseGenerator = createAgent({
      name: 'FingAI_response',
      description: "Generate the response",
      system: RESPONSE_PROMPT,
      model: modelConfig.provider(modelConfig.config)
    });

    const {output: fragmentTitle} = await fragementTitleGenerator.run(result.state.data.summary);
    const {output: response_generator} = await responseGenerator.run(result.state.data.summary);

    const isError = !result.state.data.summary || Object.keys(result.state.data.files || {}).length === 0;
    
    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      try {
        const sandbox = await getSandbox(sandboxId);
        const url = `https://${sandbox.getHost(3000)}`;
        console.log("🌐 Sandbox URL:", url);
        
        // Test if the sandbox is accessible
        try {
          const testUrl = await fetch(url, { 
            method: 'GET',
            headers: { 'User-Agent': 'Fing-AI' }
          });
          console.log(`🏥 Sandbox health check: ${testUrl.status}`);
        } catch (healthError) {
          console.warn("⚠️ Sandbox health check failed (might still be starting):", healthError);
        }
        
        return url;
      } catch (error) {
        console.error("❌ Failed to get sandbox URL:", error);
        return "sandbox-unavailable";
      }
    });

    await step.run("save-result", async () => {
      const summary = result.state.data.summary ?? "No summary generated by the agent.";
      
      console.log("💾 Saving result to database...");
      if (isError) {
        console.log("❌ Saving error result");
        return await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: summary,
            role: 'ASSISTANT',
            type: "RESULT"
          }
        });
      }
      
      console.log("✅ Saving successful result with fragment");
      return await prisma.message.create({
        data: {
          projectId: event.data.projectId,
          content: parseOut(response_generator),
          role: "ASSISTANT",
          type: "RESULT",
          fragment: {
            create: {
              sandboxUrl: sandboxUrl,
              title: parseOut(fragmentTitle),
              files: result.state.data.files,
            }
          },
        }
      });
    });

    console.log("🎉 Function completed successfully");
    return {
      url: sandboxUrl,
      title: parseOut(fragmentTitle),
      files: result.state.data.files,
      summary: result.state.data.summary
    };
  }
);