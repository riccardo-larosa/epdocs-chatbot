import { registerOTel } from "@vercel/otel";
import { AISDKExporter } from "langsmith/vercel";

export function register() {
  console.log("registering instrumentation");
  console.log(`process.env.LANGSMITH_API_KEY: ${process.env.LANGSMITH_API_KEY?.slice(0, 5)}...`);
  registerOTel({
    serviceName: "langsmith-vercel-ai-sdk",
    traceExporter: new AISDKExporter(),
  });
}