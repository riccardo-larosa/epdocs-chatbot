import { registerOTel } from "@vercel/otel";
import { AISDKExporter } from "langsmith/vercel";

export function register() {
  registerOTel({
    serviceName: "langsmith-vercel-ai-sdk",
    traceExporter: new AISDKExporter(),
  });
}