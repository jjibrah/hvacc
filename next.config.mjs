/** @type {import("next").NextConfig} */
const nextConfig = {
  experimental: {
    // The CLI checker uses a detached child process that produces no captured
    // output in this WSL environment. The compiler API is deterministic here;
    // `npm run typecheck` remains the explicit pre-build gate.
    useTypeScriptCli: false,
  },
  // Type checking is an explicit prerequisite in the build script. Keeping it
  // separate avoids duplicate compiler processes and makes CI failures clearer.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
