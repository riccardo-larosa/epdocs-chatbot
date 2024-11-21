// import { registerOTel } from "@vercel/otel";
// import { AISDKExporter } from "langsmith/vercel";


export function register() {
  // console.log("registering instrumentation");
  // console.log(`process.env.LANGCHAIN_API_KEY: ${process.env.LANGCHAIN_API_KEY?.slice(0, 5)}...`);
  // // registerOTel({
  // //   serviceName: "langsmith-vercel-ai-sdk",
  // //   traceExporter: new AISDKExporter(),
  // // });

  if (process.env.NEXT_RUNTIME === 'nodejs') {  // Only run on server

    const tracer = require('dd-trace');
    console.log(`dd-api-key: ${process.env.DD_API_KEY?.slice(0, 5)}...`);
    tracer.init({
      service: 'epdocs-chatbot-datadog',
      env: process.env.DD_ENV,
      llmobs: {
        mlApp: process.env.DD_LLMOB_ML_APP,
        agentlessEnabled: true
      }
    });

    const { llmobs } = tracer;

    // Make llmobs globally available if needed
    (global as any).llmobs = llmobs;
  }
  
 

}