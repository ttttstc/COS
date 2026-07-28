import { Client } from "@langchain/langgraph-sdk";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:2024";
const assistantId =
  process.env.NEXT_PUBLIC_ASSISTANT_ID ?? "lyl_counsel_agent";
const client = new Client({ apiUrl });

const thread = await client.threads.create();
let receivedReply = false;

for await (const event of client.runs.stream(thread.thread_id, assistantId, {
  input: {
    messages: [{ type: "human", content: "Reply from the local baseline." }],
  },
  streamMode: ["messages-tuple", "values"],
})) {
  if (event.event === "messages" || event.event === "values") {
    receivedReply = true;
  }
}

const reopened = await client.threads.get(thread.thread_id);
if (!receivedReply || reopened.thread_id !== thread.thread_id) {
  throw new Error("LangGraph thread smoke test failed.");
}

console.log(`Smoke passed for thread ${thread.thread_id}`);
