// Entry point. The .NET WebAssembly host requires a Main even when all real
// work happens through [JSExport] — JS calls in via getAssemblyExports after
// dotnet.run() returns.
return 0;
